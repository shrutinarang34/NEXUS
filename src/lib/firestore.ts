

import {
  collection,
  addDoc,
  getDocs,
  query,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  setDoc,
  runTransaction,
  getDoc,
  collectionGroup,
  where,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Expense, Category, Account, Transaction, Budget, UserSettings, Person, RecurringItem } from "@/types";
import { defaultCategories } from "./icons";
import * as md5 from 'md5';
import { deleteUser, User } from "firebase/auth";
import { addDays, addMonths, addWeeks, addYears, isBefore, isEqual, startOfDay, endOfDay } from "date-fns";


// This is now an internal helper function
const createUserDocument = async (userId: string, email: string) => {
  const batch = writeBatch(db);

  const userDocRef = doc(db, "users", userId);
  batch.set(userDocRef, { 
    email, 
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    isProUser: false, // Default to non-pro user
    featureFlags: {
      loans: true,
      budgets: true,
      transactions: true,
      aiInsights: true,
      recurring: true,
    },
    defaultDateRange: 'ytd',
    currency: 'USD',
    security: {
        is2faEnabled: false,
    }
  });

  // Default Categories
  defaultCategories.forEach(category => {
    const categoryRef = doc(collection(db, "users", userId, "categories"));
    batch.set(categoryRef, { name: category.name, icon: category.icon, type: category.type });
  });

  // Default Accounts
  const accounts = [
    { name: "Credit Card", icon: "CreditCard", type: "Credit Account", balance: 0, isDefault: false, cashbackPercentage: 1 },
    { name: "Debit Card", icon: "CreditCard", type: "Bank Account", balance: 0, isDefault: true, cashbackPercentage: 0 },
  ];
  accounts.forEach(account => {
    const accountRef = doc(collection(db, "users", userId, "accounts"));
    batch.set(accountRef, { ...account });
  });
  
  await batch.commit();
};

// New exported function to handle user creation logic robustly
export const checkAndCreateUserDocument = async (userId: string, email: string) => {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        await createUserDocument(userId, email);
    } else {
        // If user exists, just update their last login time
        await updateDoc(userDocRef, {
            lastLogin: serverTimestamp()
        });
    }
}

// User Settings
export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        // Return settings, providing defaults if they don't exist
        return {
            isProUser: data.isProUser || false,
            lastLogin: data.lastLogin,
            featureFlags: data.featureFlags || { loans: false, budgets: false, transactions: true, aiInsights: false, recurring: false },
            security: data.security || { is2faEnabled: false },
            defaultDateRange: data.defaultDateRange || 'ytd',
            currency: data.currency || 'USD',
        };
    }
    return null;
}

export const updateUserSettings = async (userId: string, settings: Partial<UserSettings>) => {
    const userDocRef = doc(db, "users", userId);
    return updateDoc(userDocRef, settings);
}

export const is2faEnabledForUser = async (userId: string): Promise<boolean> => {
    const settings = await getUserSettings(userId);
    return settings?.security?.is2faEnabled ?? false;
}

// Expenses
export const addExpense = async (userId: string, expenseData: Omit<Expense, "id" | "createdAt" | "userId">) => {
  return runTransaction(db, async (transaction) => {
    let cashbackAmount = 0;

    // Create the new expense record first
    const expenseRef = doc(collection(db, `users/${userId}/expenses`));
    
    // Handle account balance updates only if an account is associated
    if (expenseData.accountId) {
      const accountRef = doc(db, `users/${userId}/accounts`, expenseData.accountId);
      const accountDoc = await transaction.get(accountRef);

      if (accountDoc.exists()) {
        const accountData = accountDoc.data() as Account;
        
        // Calculate cashback for credit accounts
        if (accountData.type === 'Credit Account' && accountData.cashbackPercentage && accountData.cashbackPercentage > 0) {
          cashbackAmount = expenseData.amount * (accountData.cashbackPercentage / 100);
        }
        
        // Update balance
        const currentBalance = accountData.balance || 0;
        let newBalance = currentBalance;
        if (accountData.type === 'Credit Account') {
          newBalance += expenseData.amount; // Increase balance for credit accounts
        } else {
          newBalance -= expenseData.amount; // Decrease balance for bank accounts
        }
        transaction.update(accountRef, { balance: newBalance });
      }
    }
    
    // Set the expense document with all data
    transaction.set(expenseRef, {
      ...expenseData,
      cashbackAmount,
      userId,
      createdAt: serverTimestamp(),
    });
  });
};

export const addBulkExpenses = async (userId: string, expensesData: Omit<Expense, "id" | "createdAt" | "userId">[]) => {
  return runTransaction(db, async (transaction) => {
    const accountsCache: { [key: string]: Account } = {};

    // First, read all necessary account documents into a cache
    for (const rawExpenseData of expensesData) {
      if (rawExpenseData.accountId && !accountsCache[rawExpenseData.accountId]) {
        const accountRef = doc(db, `users/${userId}/accounts`, rawExpenseData.accountId);
        const accountDoc = await transaction.get(accountRef);
        if (accountDoc.exists()) {
          accountsCache[rawExpenseData.accountId] = accountDoc.data() as Account;
        }
      }
    }

    // After all reads are done, perform the writes.
    for (const rawExpenseData of expensesData) {
        let cashbackAmount = 0;
        const expenseRef = doc(collection(db, `users/${userId}/expenses`));
        
        const expenseData: Partial<typeof rawExpenseData> = { ...rawExpenseData };
        if (expenseData.accountId === undefined) {
            delete expenseData.accountId;
        }
        
        if (expenseData.accountId) {
            const accountData = accountsCache[expenseData.accountId];
            if (accountData) {
                 if (accountData.type === 'Credit Account' && accountData.cashbackPercentage && accountData.cashbackPercentage > 0) {
                    cashbackAmount = expenseData.amount! * (accountData.cashbackPercentage / 100);
                }
                
                // Update balance in cache
                if (accountData.type === 'Credit Account') {
                    accountData.balance += expenseData.amount!;
                } else {
                    accountData.balance -= expenseData.amount!;
                }
                accountsCache[expenseData.accountId] = accountData;
            }
        }
        
        transaction.set(expenseRef, {
            ...expenseData,
            cashbackAmount,
            userId,
            createdAt: serverTimestamp(),
        });
    }

    // After processing all expenses, write all updated balances from cache to Firestore
    for (const accountId in accountsCache) {
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      transaction.update(accountRef, { balance: accountsCache[accountId].balance });
    }
  });
};


export const getExpenses = async (userId: string): Promise<Expense[]> => {
  const q = query(collection(db, `users/${userId}/expenses`));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Expense)
  );
};


export const updateExpense = (
  userId: string,
  expenseId: string,
  expenseData: Partial<Expense>
) => {
  // Note: This function doesn't handle balance updates on account change.
  // A more robust implementation would calculate the balance difference.
  return updateDoc(doc(db, `users/${userId}/expenses`, expenseId), expenseData);
};

export const deleteExpense = async (userId:string, expenseId: string) => {
  const expenseRef = doc(db, `users/${userId}/expenses`, expenseId);
  
  return runTransaction(db, async (transaction) => {
    const expenseDoc = await transaction.get(expenseRef);
    if (!expenseDoc.exists()) {
        throw "Expense does not exist!";
    }

    const expenseData = expenseDoc.data();
    if (expenseData.accountId) {
        const accountRef = doc(db, `users/${userId}/accounts`, expenseData.accountId);
        const accountDoc = await transaction.get(accountRef);
        
        if (accountDoc.exists()) {
            const accountData = accountDoc.data() as Account;
            const currentBalance = accountData.balance || 0;
            let newBalance = currentBalance;
            
            if (accountData.type === 'Credit Account') {
                newBalance -= expenseData.amount; // Decrease balance on credit for deletion
            } else {
                newBalance += expenseData.amount; // Increase balance on bank for deletion
            }
            transaction.update(accountRef, { balance: newBalance });
        }
    }
    
    transaction.delete(expenseRef);
  });
};

// Transactions
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const q = query(collection(db, `users/${userId}/transactions`));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
  );
};

export const addTransaction = async (userId: string, txData: Omit<Transaction, "id" | "createdAt" | "userId">) => {
    const cleanTxData = { ...txData };
    // Remove undefined values before sending to firestore
    Object.keys(cleanTxData).forEach(key => {
      if ((cleanTxData as any)[key] === undefined) {
        delete (cleanTxData as any)[key];
      }
    });

    return runTransaction(db, async (transaction) => {
      // --- READS FIRST ---
      let fromAccountRef, toAccountRef;
      let fromAccountDoc, toAccountDoc;
      let fromAccountData: Account | undefined, toAccountData: Account | undefined;

      if (txData.fromAccountId) {
        fromAccountRef = doc(db, `users/${userId}/accounts`, txData.fromAccountId);
        fromAccountDoc = await transaction.get(fromAccountRef);
        if (fromAccountDoc.exists()) fromAccountData = fromAccountDoc.data() as Account;
      }
      if (txData.toAccountId) {
        toAccountRef = doc(db, `users/${userId}/accounts`, txData.toAccountId);
        toAccountDoc = await transaction.get(toAccountRef);
        if (toAccountDoc.exists()) toAccountData = toAccountDoc.data() as Account;
      }

      // --- WRITES SECOND ---
      const txRef = doc(collection(db, `users/${userId}/transactions`));
      transaction.set(txRef, {
        ...cleanTxData,
        userId,
        createdAt: serverTimestamp(),
      });

      // Update account balances
      if (txData.type === 'Deposit' && toAccountRef && toAccountData) {
        const toBalance = toAccountData.balance || 0;
        // Deposit into credit account decreases liability, otherwise increases bank balance
        const newBalance = toAccountData.type === 'Credit Account' ? toBalance - txData.amount : toBalance + txData.amount;
        transaction.update(toAccountRef, { balance: newBalance });

      } else if (txData.type === 'Withdrawal' && fromAccountRef && fromAccountData) {
        const fromBalance = fromAccountData.balance || 0;
        // Withdrawal from credit account increases liability, otherwise decreases bank balance
        const newBalance = fromAccountData.type === 'Credit Account' ? fromBalance + txData.amount : fromBalance - txData.amount;
        transaction.update(fromAccountRef, { balance: newBalance });

      } else if (txData.type === 'Transfer' && fromAccountRef && fromAccountData && toAccountRef && toAccountData) {
        // From Account
        const fromBalance = fromAccountData.balance || 0;
        const newFromBalance = fromAccountData.type === 'Credit Account' ? fromBalance + txData.amount : fromBalance - txData.amount;
        transaction.update(fromAccountRef, { balance: newFromBalance });
        
        // To Account
        const toBalance = toAccountData.balance || 0;
        const newToBalance = toAccountData.type === 'Credit Account' ? toBalance - txData.amount : toBalance + txData.amount;
        transaction.update(toAccountRef, { balance: newToBalance });
      }
    });
};

export const addBulkTransactions = async (userId: string, transactionsData: Omit<Transaction, "id" | "createdAt" | "userId">[]) => {
  return runTransaction(db, async (t) => {
    const accountsCache: { [key: string]: Account } = {};

    // --- All reads first ---
    for (const txData of transactionsData) {
      if (txData.toAccountId && !accountsCache[txData.toAccountId]) {
        const accountRef = doc(db, `users/${userId}/accounts`, txData.toAccountId);
        const accountDoc = await t.get(accountRef);
        if (accountDoc.exists()) {
          accountsCache[txData.toAccountId] = accountDoc.data() as Account;
        }
      }
    }

    // --- All writes second ---
    for (const txData of transactionsData) {
      if (txData.type !== 'Deposit' || !txData.toAccountId) continue;

      const txRef = doc(collection(db, `users/${userId}/transactions`));
      t.set(txRef, {
        ...txData,
        userId,
        createdAt: serverTimestamp(),
      });
      
      const accountData = accountsCache[txData.toAccountId];
      if (accountData) {
        // This assumes deposits always increase balance, which is true for bank accounts
        // but decreases liability for credit accounts. The logic here is simplified for bulk bank deposits.
        const newBalance = (accountData.balance || 0) + txData.amount;
        accountsCache[txData.toAccountId].balance = newBalance;
      }
    }

    // Final write of all updated balances from cache
    for (const accountId in accountsCache) {
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      t.update(accountRef, { balance: accountsCache[accountId].balance });
    }
  });
};


export const deleteTransaction = async (userId: string, transactionId: string) => {
  const txRef = doc(db, `users/${userId}/transactions`, transactionId);

  return runTransaction(db, async (t) => {
    const txDoc = await t.get(txRef);
    if (!txDoc.exists()) {
      throw new Error("Transaction does not exist!");
    }

    const txData = txDoc.data() as Transaction;
    const { type, amount, fromAccountId, toAccountId } = txData;
    
    // Reverse balance changes
    if (type === 'Deposit' && toAccountId) {
      const accountRef = doc(db, `users/${userId}/accounts`, toAccountId);
      const accountDoc = await t.get(accountRef);
      if (accountDoc.exists()) {
        const accData = accountDoc.data() as Account;
        const reversalAmount = accData.type === 'Credit Account' ? amount : -amount;
        t.update(accountRef, { balance: (accData.balance || 0) + reversalAmount });
      }
    } else if (type === 'Withdrawal' && fromAccountId) {
      const accountRef = doc(db, `users/${userId}/accounts`, fromAccountId);
      const accountDoc = await t.get(accountRef);
      if (accountDoc.exists()) {
        const accData = accountDoc.data() as Account;
        const reversalAmount = accData.type === 'Credit Account' ? -amount : amount;
        t.update(accountRef, { balance: (accData.balance || 0) + reversalAmount });
      }
    } else if (type === 'Transfer' && fromAccountId && toAccountId) {
      // Revert "from" account
      const fromRef = doc(db, `users/${userId}/accounts`, fromAccountId);
      const fromDoc = await t.get(fromRef);
      if (fromDoc.exists()) {
        const fromData = fromDoc.data() as Account;
        const reversalAmount = fromData.type === 'Credit Account' ? -amount : amount;
        t.update(fromRef, { balance: (fromData.balance || 0) + reversalAmount });
      }
      // Revert "to" account
      const toRef = doc(db, `users/${userId}/accounts`, toAccountId);
      const toDoc = await t.get(toRef);
      if (toDoc.exists()) {
        const toData = toDoc.data() as Account;
        const reversalAmount = toData.type === 'Credit Account' ? amount : -amount;
        t.update(toRef, { balance: (toData.balance || 0) + reversalAmount });
      }
    }

    t.delete(txRef);
  });
};


// Categories
export const getCategories = async (userId: string): Promise<Category[]> => {
  const q = query(collection(db, `users/${userId}/categories`));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Category)
  );
};

export const addCategory = (userId: string, categoryData: Omit<Category, "id">) => {
  return addDoc(collection(db, `users/${userId}/categories`), categoryData);
};

export const updateCategory = (
  userId: string,
  categoryId: string,
  categoryData: Partial<Category>
) => {
  return updateDoc(doc(db, `users/${userId}/categories`, categoryId), categoryData);
};

export const deleteCategory = (userId: string, categoryId: string) => {
  return deleteDoc(doc(db, `users/${userId}/categories`, categoryId));
};

export const resetCategories = async (userId: string) => {
    const batch = writeBatch(db);
    const categoriesRef = collection(db, "users", userId, "categories");
    
    // Get current categories to avoid duplicates
    const querySnapshot = await getDocs(categoriesRef);
    const existingCategoryNames = new Set(querySnapshot.docs.map(doc => doc.data().name));

    // Add only the default categories that don't already exist
    defaultCategories.forEach(category => {
        if (!existingCategoryNames.has(category.name)) {
            const newCategoryRef = doc(categoriesRef);
            batch.set(newCategoryRef, { name: category.name, icon: category.icon, type: category.type });
        }
    });

    await batch.commit();
}


// Accounts
export const getAccounts = async (userId: string): Promise<Account[]> => {
  const q = query(collection(db, `users/${userId}/accounts`));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Account)
  );
};

export const addAccount = async (userId: string, accountData: Omit<Account, "id">) => {
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const querySnapshot = await getDocs(accountsRef);
    const isFirstAccount = querySnapshot.empty;
    return addDoc(accountsRef, {
        ...accountData,
        isDefault: isFirstAccount,
    });
};

export const updateAccount = (
  userId: string,
  accountId: string,
  accountData: Partial<Account>
) => {
  return updateDoc(doc(db, `users/${userId}/accounts`, accountId), accountData);
};

export const deleteAccount = (userId: string, accountId: string) => {
  return deleteDoc(doc(db, `users/${userId}/accounts`, accountId));
};

export const setDefaultAccount = async (userId: string, accountId: string) => {
  const batch = writeBatch(db);
  const accountsRef = collection(db, "users", userId, "accounts");
  
  const querySnapshot = await getDocs(accountsRef);
  querySnapshot.forEach(doc => {
    batch.update(doc.ref, { isDefault: false });
  });

  const newDefaultAccountRef = doc(db, "users", userId, "accounts", accountId);
  batch.update(newDefaultAccountRef, { isDefault: true });

  await batch.commit();
}


// Budgets
export const addBudget = (userId: string, budgetData: Omit<Budget, "id" | "createdAt" | "userId">) => {
    return addDoc(collection(db, `users/${userId}/budgets`), {
        ...budgetData,
        userId,
        createdAt: serverTimestamp()
    });
}

export const getBudgets = async (userId: string): Promise<Budget[]> => {
    const q = query(collection(db, `users/${userId}/budgets`), orderBy("startDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
};

export const getBudget = async (userId: string, budgetId: string): Promise<Budget | null> => {
    const docRef = doc(db, `users/${userId}/budgets`, budgetId);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
        return { id: docSnap.id, ...docSnap.data() } as Budget;
    }
    return null;
}

export const updateBudget = (userId: string, budgetId: string, budgetData: Partial<Budget>) => {
    return updateDoc(doc(db, `users/${userId}/budgets`, budgetId), budgetData);
}

export const deleteBudget = (userId: string, budgetId: string) => {
    return deleteDoc(doc(db, `users/${userId}/budgets`, budgetId));
}

// Recurring Items
export const getRecurringItems = async (userId: string): Promise<RecurringItem[]> => {
    const q = query(collection(db, `users/${userId}/recurringItems`), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringItem));
};

export const addRecurringItem = (userId: string, item: Omit<RecurringItem, 'id' | 'createdAt' | 'userId'>) => {
    return addDoc(collection(db, `users/${userId}/recurringItems`), {
        ...item,
        userId,
        createdAt: serverTimestamp(),
    });
};

export const updateRecurringItem = (userId: string, itemId: string, item: Partial<RecurringItem>) => {
    const dataToUpdate = { ...item };
    // Firestore doesn't support `undefined`
    if (dataToUpdate.endDate === undefined) {
        delete (dataToUpdate as any).endDate;
    }
    return updateDoc(doc(db, `users/${userId}/recurringItems`, itemId), dataToUpdate);
};

export const deleteRecurringItem = (userId: string, itemId: string) => {
    return deleteDoc(doc(db, `users/${userId}/recurringItems`, itemId));
};

export const processRecurringItems = async (userId: string): Promise<number> => {
    const today = startOfDay(new Date());
    const itemsRef = collection(db, `users/${userId}/recurringItems`);
    const activeItemsQuery = query(itemsRef, where('isActive', '==', true));
    
    const activeItemsSnapshot = await getDocs(activeItemsQuery);
    
    const dueItems = activeItemsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as RecurringItem))
        .filter(item => {
            if (!item.nextDueDate) return false;
            const nextDueDate = item.nextDueDate.toDate();
            // Process if the due date is today or in the past.
            return isBefore(nextDueDate, endOfDay(today));
        });
    if (dueItems.length === 0) return 0;

    let itemsProcessed = 0;

    for (const item of dueItems) {
        // Ensure `nextDueDate` is valid before proceeding
        if (!item.nextDueDate) continue;

        let currentDueDate = item.nextDueDate.toDate();

        // Loop to catch up on any missed due dates
        while (isBefore(currentDueDate, endOfDay(today))) {
            // If the item has an end date and we've passed it, deactivate and stop.
            if (item.endDate && isBefore(item.endDate.toDate(), currentDueDate)) {
                await updateRecurringItem(userId, item.id, { isActive: false });
                break; 
            }

            const startOfDueDate = startOfDay(currentDueDate);
            const endOfDueDate = endOfDay(currentDueDate);
            
            // Check if an expense with the same name was already manually entered on the due date
            const expenseQuery = query(
              collection(db, `users/${userId}/expenses`),
              where("name", "==", item.name)
            );
            const expenseSnapshot = await getDocs(expenseQuery);
            
            const expenseExists = expenseSnapshot.docs.some(doc => {
                const expenseDate = doc.data().date.toDate();
                return expenseDate >= startOfDueDate && expenseDate <= endOfDueDate;
            });


            if (!expenseExists) {
                // Only process if no manually added expense with the same name exists for that day.
                itemsProcessed++;
                if (item.type === 'expense') {
                    await addExpense(userId, {
                        name: item.name, amount: item.amount, date: Timestamp.fromDate(currentDueDate),
                        categoryId: item.categoryId!, accountId: item.accountId,
                    });
                } else if (item.type === 'transaction') {
                    await addTransaction(userId, {
                        type: item.transactionType!, amount: item.amount, date: Timestamp.fromDate(currentDueDate),
                        description: item.name,
                        ...(item.transactionType === 'Deposit' && { toAccountId: item.accountId }),
                        ...(item.transactionType === 'Withdrawal' && { fromAccountId: item.accountId })
                    });
                }
            }
            
            // Calculate the next due date from the current one in the loop
            switch (item.frequency) {
                case 'daily': currentDueDate = addDays(currentDueDate, 1); break;
                case 'weekly': currentDueDate = addWeeks(currentDueDate, 1); break;
                case 'biweekly': currentDueDate = addWeeks(currentDueDate, 2); break;
                case 'monthly': currentDueDate = addMonths(currentDueDate, 1); break;
                case 'yearly': currentDueDate = addYears(currentDueDate, 1); break;
            }
        }
        
        // Update the item's nextDueDate to the newly calculated future date
        await updateRecurringItem(userId, item.id, { nextDueDate: Timestamp.fromDate(currentDueDate) });
    }
    return itemsProcessed;
};


// User Account Deletion
const deleteCollection = async (collectionPath: string) => {
    const q = query(collection(db, collectionPath));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export const deleteUserAccount = async (user: User) => {
    const userId = user.uid;

    // The user needs to be recently signed in for this to work.
    // This is a security measure from Firebase.
    try {
        // 1. Delete all sub-collections
        await deleteCollection(`users/${userId}/expenses`);
        await deleteCollection(`users/${userId}/categories`);
        await deleteCollection(`users/${userId}/accounts`);
        await deleteCollection(`users/${userId}/transactions`);
        await deleteCollection(`users/${userId}/budgets`);
        await deleteCollection(`users/${userId}/persons`);
        await deleteCollection(`users/${userId}/loanTransactions`);
        await deleteCollection(`users/${userId}/recurringItems`);

        // 2. Delete the user document itself
        await deleteDoc(doc(db, "users", userId));

        // 3. Delete the user from Firebase Authentication
        await deleteUser(user);

    } catch (error: any) {
        console.error("Error deleting user account:", error);
        if (error.code === 'auth/requires-recent-login') {
            throw new Error("This is a sensitive operation and requires you to have recently signed in. Please log out and log back in to delete your account.");
        }
        throw new Error("Failed to delete account.");
    }
}
