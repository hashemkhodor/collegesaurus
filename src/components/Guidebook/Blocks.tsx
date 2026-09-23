import {useCallback, useId, useRef, useState, type ReactNode} from 'react';
import Heading from '@theme/Heading';
import {useGuide} from './strings';
import {Chip, Ext, MoreButton, SECTION_LOOK, isolateLatin, useCollapsible} from './parts';

type SectionProps = {
  sectionId: string;
  sectionKey?: string;
  title: string;
  count?: string;
  children: ReactNode;
};

export function GuideSection({sectionId, sectionKey, title, count, children}: SectionProps): ReactNode {
  const {s, locale} = useGuide();
  const [icon, tint] = (sectionKey && SECTION_LOOK[sectionKey]) || ['layers', 'neutral'];
  const heading = sectionKey === 'faculty' ? s.chips.faculty : title;
  return (
    <div className="sec-slot" data-slot={sectionId}>
      <section className="sec" data-sec={sectionId} aria-labelledby={sectionId}>
        <div className="sec-head">
          <Chip name={icon} tint={tint} round />
          <Heading as="h2" id={sectionId}>
            {isolateLatin(heading, locale)}
          </Heading>
          {count ? <span className="sec-count">{count}</span> : null}
        </div>
        <div className="sec-body">{children}</div>
      </section>
    </div>
  );
}

// Everything after a long section's third subheading.
export function GuideMore({count, children}: {count: string; children: ReactNode}): ReactNode {
  const {s} = useGuide();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const open = useCallback(() => setExpanded(true), []);
  const ref = useRef<HTMLDivElement>(null);
  useCollapsible(ref, !expanded, open);
  return (
    <>
      <div className="overflow" id={id} ref={ref} hidden={!expanded}>
        {children}
      </div>
      <MoreButton
        expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        more={s.showMoreSections(Number(count))}
        fewer={s.showFewerSections}
        controls={id}
      />
    </>
  );
}

export function GuideSources({count, children}: {count: string; children: ReactNode}): ReactNode {
  const {s} = useGuide();
  return (
    <p className="src">
      <span>{Number(count) > 1 ? s.sources : s.source}:</span>
      {children}
    </p>
  );
}

export function GuideExt(): ReactNode {
  return <Ext size={14} />;
}
