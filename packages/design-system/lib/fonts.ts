import { Roboto_Mono } from 'next/font/google'
import localFont from 'next/font/local'

export const pretendard = localFont({
	src: "../fonts/PretendardVariable.woff2",
	display: "swap",
	weight: "45 950",
	variable: "--font-pretendard",
});

export const robotoMono = Roboto_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	display: "swap",
	variable: "--font-roboto-mono",
});
