export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="site-footer__inner">
        <div>
          <div className="site-footer__title">Next Level Rentals</div>
          <p>
            Built to streamline communication between property managers and tenants while delivering a premium resident
            experience.
          </p>
        </div>
        <div>
          <div className="site-footer__title">Contact</div>
          <a className="site-footer__link" href="mailto:support@nxtlevelrentals.com">
            support@nxtlevelrentals.com
          </a>
          <a className="site-footer__link" href="tel:+15551234567">
            (555) 123-4567
          </a>
          <a className="site-footer__link" href="https://nxtlevelrentals.com" target="_blank" rel="noreferrer">
            nxtlevelrentals.com
          </a>
        </div>
        <div>
          <div className="site-footer__title">Resources</div>
          <a className="site-footer__link" href="/portal">
            Tenant Portal
          </a>
          <a className="site-footer__link" href="https://docs.nxtlevelrentals.com" target="_blank" rel="noreferrer">
            Documentation
          </a>
          <a className="site-footer__link" href="mailto:partnerships@nxtlevelrentals.com">
            Partnerships
          </a>
        </div>
      </div>
    </footer>
  );
}
