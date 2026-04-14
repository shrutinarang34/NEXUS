
import Image from "next/image";
import { LogoProps } from "./MastercardLogo";

export const AmExLogo = ({ className, width = 38, height = 24 }: LogoProps) => (
  <Image
    src="/images/amex.png"
    alt="Amex Logo"
    width={width}
    height={height}
    className={className}
  />
);
