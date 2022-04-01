import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {dracula} from 'react-syntax-highlighter/dist/cjs/styles/prism';

export default function CodeBlock({code}: {code: string}) {
  return (
    <SyntaxHighlighter language="javascript" style={dracula} showLineNumbers>
      {code}
    </SyntaxHighlighter>
  );
}
