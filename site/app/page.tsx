import {getChatGPTUser,chatGPTSignInPath} from './chatgpt-auth';
import Chef from './Chef';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <Chef signedIn={!!user} signInPath={chatGPTSignInPath('/')}/>}
