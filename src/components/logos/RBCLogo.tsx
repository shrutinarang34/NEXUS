
import Image from "next/image";
import { LogoProps } from "./MastercardLogo";

export const RBCLogo = ({ className, width = 38, height = 24 }: LogoProps) => (
  <Image
    src="/images/rbc.png"
    alt="Mastercard Logo"
    width={width}
    height={height}
    className={className}
  />
);
