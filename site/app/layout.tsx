import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'우리집 셰프 · 내 냉장고',description:'내 AI와 함께 기록하는 우리집 식재료. 사용자 확인 후 저장합니다.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
