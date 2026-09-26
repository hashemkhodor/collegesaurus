import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function TagPills({
  tags,
}: {
  tags: readonly {label: string; permalink: string}[];
}): ReactNode {
  if (tags.length === 0) return null;
  return (
    <ul className={styles.tags}>
      {tags.map((tag) => (
        <li key={tag.permalink}>
          <Link to={tag.permalink} className={styles.tag}>
            {tag.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
