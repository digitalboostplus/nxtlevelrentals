import Link from 'next/link';
import { company } from '@/data/site';

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="site-footer__inner">
        <div>
          <div className="site-footer__title">{company.name}</div>
          <p>
            {company.streetAddress}, {company.city}, {company.state} {company.postalCode}
          </p>
          <a className="site-footer__link" href={`tel:${company.phoneTel}`}>
            {company.phoneDisplay}
          </a>
          <a className="site-footer__link" href={`mailto:${company.email}`}>
            {company.email}
          </a>
        </div>
        <div>
          <div className="site-footer__title">Residents</div>
          <Link className="site-footer__link" href="/login?next=/portal">
            Pay rent
          </Link>
          <Link className="site-footer__link" href="/#maintenance">
            Request a repair
          </Link>
          <Link className="site-footer__link" href="/#local-guide">
            Local guide
          </Link>
          <Link className="site-footer__link" href="/login?next=/portal">
            Tenant portal sign in
          </Link>
        </div>
        <div>
          <div className="site-footer__title">Owners</div>
          <Link className="site-footer__link" href="/login?next=/landlord">
            Landlord console sign in
          </Link>
          <Link className="site-footer__link" href="/login?next=/landlord/financials">
            Monthly statements and payouts
          </Link>
          <Link className="site-footer__link" href="/login?next=/landlord/maintenance">
            Maintenance activity
          </Link>
        </div>
      </div>
    </footer>
  );
}
