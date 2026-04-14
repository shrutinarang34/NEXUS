
import { icons } from "lucide-react";

export const iconList = [
  "House", "ShoppingCart", "Car", "Utensils", "Fuel", 
  "Ticket", "HeartPulse", "Plane", "Book", "Gift",
  "Briefcase", "PiggyBank", "Landmark", "Shield", "Wrench",
  "Music", "Clapperboard", "Gamepad2", "Laptop", "Smartphone",
  "Coffee", "Beer", "Pizza", "GraduationCap", "PawPrint",
  "Smile", "CreditCard", "Wallet", "Shirt", "HandCoins"
];

export const defaultCategories = [
    { name: "Groceries", icon: "ShoppingCart", type: 'Need' },
    { name: "Restaurants", icon: "Utensils", type: 'Want' },
    { name: "Transportation", icon: "Car", type: 'Need' },
    { name: "Gas", icon: "Fuel", type: 'Need' },
    { name: "Rent/Mortgage", icon: "House", type: 'Need' },
    { name: "Utilities", icon: "Wrench", type: 'Need' },
    { name: "Health", icon: "HeartPulse", type: 'Need' },
    { name: "Insurance", icon: "Shield", type: 'Need' },
    { name: "Shopping", icon: "Shirt", type: 'Want' },
    { name: "Entertainment", icon: "Clapperboard", type: 'Want' },
    { name: "Travel", icon: "Plane", type: 'Want' },
    { name: "Education", icon: "Book", type: 'Want' },
    { name: "Personal Care", icon: "Smile", type: 'Want' },
    { name: "Pets", icon: "PawPrint", type: 'Want' },
    { name: "Gifts/Donations", icon: "Gift", type: 'Want' },
    { name: "Subscriptions", icon: "Ticket", type: 'Want' },
];

const accountIconMapping: { [key: string]: string } = {
  visa: "Visa",
  mastercard: "Mastercard",
  chase: "Chase",
  scotiabank: "Scotiabank",
  "bank of america": "BankOfAmerica",
  bofa: "BankOfAmerica",
  rbc: "RBC",
  "royal bank": "RBC",
  td: "TD",
  "toronto dominion": "TD",
  amex: "CreditCard",
  "american express": "CreditCard",
  citi: "Landmark",
  wells: "Landmark",
  fargo: "Landmark",
  cash: "Wallet",
  credit: "CreditCard",
  debit: "CreditCard",
};

export const getIconForAccount = (accountName: string, accountType: 'Bank Account' | 'Credit Account'): string => {
    const lowerCaseName = accountName.toLowerCase();
    for (const keyword in accountIconMapping) {
        if (lowerCaseName.includes(keyword)) {
            return accountIconMapping[keyword];
        }
    }
    
    if (accountType === 'Bank Account') {
      return 'Landmark';
    }

    if (accountType === 'Credit Account') {
      return 'CreditCard';
    }

    return "Landmark";
};
