import Image from "next/image";
import { LogoProps } from "./MastercardLogo";

export const AppLogo = ({ className, width = 38, height = 24 }: LogoProps) => (
  <Image
    src="/images/favicon.png"
    alt="Nexus App Logo"
    width={width}
    height={height}
    className={className}
  />
);
