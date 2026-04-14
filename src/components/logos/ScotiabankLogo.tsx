
import Image from "next/image";
import { LogoProps } from "./MastercardLogo";

export const ScotiabankLogo = ({ className, width = 38, height = 24 }: LogoProps) => (
  <Image
    src="/images/scotiabank.png"
    alt="Scotiabank Logo"
    width={width}
    height={height}
    className={className}
  />
);
