

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
  runTransaction,
  getDoc,
  where,
  Timestamp,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Person, LoanTransaction, Account, UserSettings, Transaction, HouseholdUser } from "@/types";
import * as md5 from 'md5';

interface AddLoanTransactionParams {
    personId: string | null;
    personData?: Omit<Person, "id" | "createdAt" | "currentBalance">;
    transactionData: Omit<LoanTransaction, "id" | "createdAt" | "personId">;
}

// User Settings
export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        return {
            featureFlags: data.featureFlags || { loans: true, budgets: true, transactions: true },
            currency: data.currency || 'USD',
        } as UserSettings;
    }
    return null;
}

// People
export const addPerson = async (
    userId: string, 
    personData: Omit<Person, "id" | "createdAt" | "currentBalance">
) => {
    return addDoc(collection(db, `users/${userId}/persons`), {
        ...personData,
        currentBalance: 0,
        createdAt: serverTimestamp(),
    });
};

export const getPersons = async (userId: string): Promise<Person[]> => {
  const q = query(collection(db, `users/${userId}/persons`), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Person)
  );
};

export const getPerson = async (userId: string, personId: string): Promise<Person | null> => {
    const docRef = doc(db, `users/${userId}/persons`, personId);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
        return { id: docSnap.id, ...docSnap.data() } as Person;
    }
    return null;
}

export const updatePerson = (userId: string, personId: string, personData: Partial<Person>) => {
  return updateDoc(doc(db, `users/${userId}/persons`, personId), personData);
};

export const deletePerson = async (userId: string, personId: string) => {
    const personRef = doc(db, `users/${userId}/persons`, personId);
    
    return runTransaction(db, async (t) => {
        const personDoc = await t.get(personRef);

        if (!personDoc.exists()) {
            throw new Error("This person does not exist.");
        }
        
        if (personDoc.data().currentBalance !== 0) {
            throw new Error("Cannot delete a person with an outstanding balance. Please clear their balance first.");
        }

        // Also delete all associated loan transactions
        const transactionsQuery = query(collection(db, `users/${userId}/loanTransactions`), where("personId", "==", personId));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        transactionsSnapshot.forEach(doc => t.delete(doc.ref));

        t.delete(personRef);
    });
};


// Loan Transactions
export const getLoanTransactions = async (userId: string): Promise<LoanTransaction[]> => {
  const q = query(collection(db, `users/${userId}/loanTransactions`), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as LoanTransaction)
  );
};

export const getLoanTransactionsForPerson = async (userId: string, personId: string): Promise<LoanTransaction[]> => {
  const q = query(
      collection(db, `users/${userId}/loanTransactions`), 
      where("personId", "==", personId),
      orderBy("date", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanTransaction));
};

export const addLoanTransaction = async (userId: string, { personId, personData, transactionData }: AddLoanTransactionParams) => {
    return runTransaction(db, async (t) => {
        let finalPersonId = personId;
        let personRef;
        let personName;

        // --- READS FIRST ---
        if (finalPersonId && finalPersonId !== 'new') {
            personRef = doc(db, `users/${userId}/persons`, finalPersonId);
            const personDoc = await t.get(personRef);
            if (!personDoc.exists()) throw new Error("Person not found.");
            personName = personDoc.data().name;
        } else if (personData) {
            personRef = doc(collection(db, `users/${userId}/persons`));
            finalPersonId = personRef.id;
            personName = personData.name;
        } else {
            throw new Error("Invalid person data provided.");
        }

        const accountRef = doc(db, `users/${userId}/accounts`, transactionData.accountId);
        const accountDoc = await t.get(accountRef);
        if (!accountDoc.exists()) throw new Error("Account not found.");
        const accountData = accountDoc.data() as Account;


        // --- WRITES SECOND ---
        let balanceChange = 0;
        let mainTxType: Transaction['type'] | null = null;
        let mainTxDescription = "";

        switch (transactionData.type) {
            case 'lent': 
                balanceChange = transactionData.amount;
                mainTxType = 'Withdrawal';
                mainTxDescription = `Loan to ${personName}`;
                break;
            case 'borrowed':
                balanceChange = -transactionData.amount; 
                mainTxType = 'Deposit';
                mainTxDescription = `Loan from ${personName}`;
                break;
            case 'repayment_received': 
                balanceChange = -transactionData.amount;
                mainTxType = 'Deposit';
                mainTxDescription = `Repayment from ${personName}`;
                break;
            case 'repayment_made': 
                balanceChange = transactionData.amount;
                mainTxType = 'Withdrawal';
                mainTxDescription = `Repayment to ${personName}`;
                break;
        }
        
        if (personId === 'new' || !personId) {
            if (!personData) throw new Error("Person data is required for a new person.");
            t.set(personRef!, {
                ...personData,
                currentBalance: balanceChange,
                createdAt: serverTimestamp()
            });
        } else { 
            const personDoc = await t.get(personRef!);
            const currentBalance = personDoc.data()!.currentBalance || 0;
            t.update(personRef!, {
                currentBalance: currentBalance + balanceChange
            });
        }

        // Create a corresponding transaction to keep main account balances in sync
        if(mainTxType) {
            const transactionRef = doc(collection(db, `users/${userId}/transactions`));
            t.set(transactionRef, {
                type: mainTxType,
                amount: transactionData.amount,
                date: transactionData.date,
                description: mainTxDescription,
                userId: userId,
                ...(mainTxType === 'Deposit' && { toAccountId: transactionData.accountId }),
                ...(mainTxType === 'Withdrawal' && { fromAccountId: transactionData.accountId }),
                createdAt: serverTimestamp(),
            });
        }
        
        // Update Account Balance
        const currentAcctBalance = accountData.balance || 0;
        const newAcctBalance = mainTxType === 'Deposit' ? currentAcctBalance + transactionData.amount : currentAcctBalance - transactionData.amount;
        t.update(accountRef, { balance: newAcctBalance });


        // Create the loan transaction record for history
        const loanTransactionRef = doc(collection(db, `users/${userId}/loanTransactions`));
        t.set(loanTransactionRef, {
            ...transactionData,
            personId: finalPersonId,
            createdAt: serverTimestamp(),
        });
        
        return finalPersonId;
    });
};

export const deleteLoanTransaction = async (userId: string, loanTxId: string) => {
    const loanTxRef = doc(db, `users/${userId}/loanTransactions`, loanTxId);

    return runTransaction(db, async (t) => {
        const loanTxDoc = await t.get(loanTxRef);
        if (!loanTxDoc.exists()) {
            throw new Error("Loan transaction not found.");
        }

        const loanTxData = loanTxDoc.data() as LoanTransaction;
        const { personId, type, amount, accountId } = loanTxData;

        // Revert the balances
        const personRef = doc(db, `users/${userId}/persons`, personId);
        const personDoc = await t.get(personRef);
        const accountRef = doc(db, `users/${userId}/accounts`, accountId);
        const accountDoc = await t.get(accountRef);

        let balanceChange = 0;
        let mainTxReversalAmount = 0;

        switch (type) {
            case 'lent': 
                balanceChange = -amount; 
                mainTxReversalAmount = amount; // Add back to account
                break;
            case 'borrowed': 
                balanceChange = amount; 
                mainTxReversalAmount = -amount; // Subtract from account
                break;
            case 'repayment_received': 
                balanceChange = amount; 
                mainTxReversalAmount = -amount; // Subtract from account
                break;
            case 'repayment_made': 
                balanceChange = -amount; 
                mainTxReversalAmount = amount; // Add back to account
                break;
        }

        if (personDoc.exists()) {
            const currentBalance = personDoc.data().currentBalance || 0;
            t.update(personRef, { currentBalance: currentBalance + balanceChange });
        }
        
        if (accountDoc.exists()) {
            const currentBalance = accountDoc.data().balance || 0;
            t.update(accountRef, { balance: currentBalance + mainTxReversalAmount });
        }
        
        t.delete(loanTxRef);
    });
};

export const getHouseholdUsers = async (userId: string): Promise<HouseholdUser[]> => {
    const q = query(collection(db, `users/${userId}/householdUsers`));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as HouseholdUser)
    );
};
