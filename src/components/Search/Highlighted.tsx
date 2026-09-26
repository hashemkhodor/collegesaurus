import type {ReactNode} from 'react';
import {highlight} from './snippet';

export default function Highlighted({text, terms, className}: {text: string; terms: string[]; className?: string}): ReactNode {
  return highlight(text, terms).map((segment, i) =>
    segment.match ? (
      <mark key={i} className={className}>
        {segment.text}
      </mark>
    ) : (
      <span key={i}>{segment.text}</span>
    ),
  );
}
