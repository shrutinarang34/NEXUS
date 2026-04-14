import Image from "next/image";
import { LogoProps } from "./MastercardLogo";


export const VisaLogo = ({ className, width = 38, height = 24 }: LogoProps) => (
  <Image
    src="/images/visa.png"
    alt="Visa Logo"
    width={width}
    height={height}
    className={className}
  />
);
