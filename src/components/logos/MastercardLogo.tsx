
import Image from "next/image";

export interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const MastercardLogo = ({ className, width = 38, height = 24 }: LogoProps) => (
  <Image
    src="/images/mastercard.png"
    alt="Mastercard Logo"
    width={width}
    height={height}
    className={className}
  />
);
