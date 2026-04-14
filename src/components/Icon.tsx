
import { icons } from "lucide-react";
import { VisaLogo } from "./logos/VisaLogo";
import { MastercardLogo } from "./logos/MastercardLogo";
import { ChaseLogo } from "./logos/ChaseLogo";
import { ScotiabankLogo } from "./logos/ScotiabankLogo";
import { BankOfAmericaLogo } from "./logos/BankOfAmericaLogo";
import { RBCLogo } from "./logos/RBCLogo";
import { TDLogo } from "./logos/TDLogo";
import { AmExLogo } from "./logos/AmExLogo";
import { AppLogo } from "./logos/AppLogo";


interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export const Icon = ({ name, ...props }: IconProps) => {
  // Custom Logos
  if (name === "AmEx") return <AmExLogo {...props} />;
  if (name === "Visa") return <VisaLogo {...props} />;
  if (name === "Mastercard") return <MastercardLogo {...props} />;
  if (name === "Chase") return <ChaseLogo {...props} />;
  if (name === "Scotiabank") return <ScotiabankLogo {...props} />;
  if (name === "BankOfAmerica") return <BankOfAmericaLogo {...props} />;
  if (name === "RBC") return <RBCLogo {...props} />;
  if (name === "TD") return <TDLogo {...props} />;
  if (name === "AppLogo") return <AppLogo {...props} />;

  // Lucide Icons
  const LucideIcon = icons[name as keyof typeof icons];

  if (!LucideIcon) {
    return null;
  }

  return <LucideIcon {...props} />;
};
