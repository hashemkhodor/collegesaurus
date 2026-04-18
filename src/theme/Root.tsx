/**
 * Wraps every Docusaurus page so we can inject site-wide chrome (like the
 * chat bubble) without swizzling Layout. See:
 * https://docusaurus.io/docs/swizzling#wrapper-your-site-with-root
 */
import type {ReactNode} from 'react';
import ChatBubble from '@site/src/components/ChatBubble';

export default function Root({children}: {children: ReactNode}): ReactNode {
  return (
    <>
      {children}
      <ChatBubble />
    </>
  );
}
