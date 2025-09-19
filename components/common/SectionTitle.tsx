import type { ReactNode } from 'react';

type SectionTitleProps = {
  title: string;
  subtitle?: ReactNode;
};

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="section__header">
      <h2 className="section__title">{title}</h2>
      {subtitle ? <p className="section__subtitle">{subtitle}</p> : null}
    </div>
  );
}
