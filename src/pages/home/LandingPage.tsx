import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

/**
 * Public marketing landing page served at "/".
 *
 * Converted from the static direco-landing.html. All of its CSS lives in
 * LandingPage.css scoped under `.direco-landing`, so none of it leaks into the
 * authenticated app — the one exception is the page background, which has to sit
 * on <body> to cover the viewport and is applied/removed by the effect below.
 *
 * Link policy: "Login" enters the app at /login; Product / How it works /
 * Integrations scroll to their in-page sections; "Request a demo" is inert until
 * a contact page exists.
 */
const LandingPage: React.FC = () => {
  /* Dark page background + smooth anchor scrolling, reverted on unmount so the
     rest of the app keeps its own look. */
  useEffect(() => {
    const { body, documentElement: html } = document;
    const prevBg     = body.style.background;
    const prevScroll = html.style.scrollBehavior;
    body.style.background   = "#17170F";
    html.style.scrollBehavior = "smooth";
    return () => {
      body.style.background     = prevBg;
      html.style.scrollBehavior = prevScroll;
    };
  }, []);

  /* Fade sections in as they enter the viewport.
     .reveal starts at opacity 0, so anything that never gets the "in" class stays
     invisible — hence the two safeguards: reveal whatever is already on screen at
     mount, and reveal everything outright where IntersectionObserver is missing. */
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".direco-landing .reveal"),
    );

    if (typeof IntersectionObserver === "undefined") {
      els.forEach(el => el.classList.add("in"));
      return;
    }

    const inViewport = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    els.forEach(el => {
      if (inViewport(el)) el.classList.add("in");   // above the fold — show now
      else io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return (
    <div className="direco-landing">
      <div className="grain" />

      <header>
        <nav className="wrap">
          <div className="wordmark">
            DIRECO<span className="dot">.</span>
            <span className="sub">distributor&nbsp;to&nbsp;retail&nbsp;connect</span>
          </div>
          <div className="nav-links">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#integrations">Integrations</a>
            {/* Styled as .btn so the mobile rule hiding plain nav links keeps it visible */}
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <button type="button" className="btn btn-primary">Request a demo</button>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <div className="eyebrow">For distribution businesses</div>
              <h1>
                From godown to shop shutter, <em>tracked to the last case.</em>
              </h1>
              <p className="lead">
                Direco replaces the paper delivery challan with live picklists,
                GPS-verified routes, and same-day cash settlement — built for how
                distribution businesses actually move goods.
              </p>
              <div className="hero-cta">
                <button type="button" className="btn btn-primary">Request a demo</button>
                <a href="#how" className="btn btn-ghost">See how it works</a>
              </div>
              <div className="hero-note">No paper trail. No end-of-week surprises.</div>
            </div>

            <div className="waybill-stage reveal">
              <div className="carbon-copy blue" />
              <div className="carbon-copy pink" />
              <div className="waybill">
                <div className="waybill-head">
                  <div>
                    <div className="label">Waybill</div>
                    <div className="id">DIRE-00214</div>
                  </div>
                  <div className="badge">18 cases · 3 SKU</div>
                </div>
                <div className="waybill-route">Rasulgarh Godown → Sahid Nagar Retail</div>
                <div className="waybill-meta">Delivery agent — R. Nayak</div>
                <ul className="stepper">
                  <li className="done">Picklist assigned</li>
                  <li className="done">Dispatched from godown</li>
                  <li className="done">Delivered — GPS confirmed</li>
                  <li className="done settled">Day End settled</li>
                </ul>
                <div className="stamp-mark">SETTLED</div>
              </div>
            </div>
          </div>
        </section>

        <div className="manifest">
          <div className="wrap manifest-row">
            <div className="manifest-item"><span className="manifest-code">PKL</span><span className="txt">Digital picklists</span></div>
            <div className="manifest-item"><span className="manifest-code">GPS</span><span className="txt">Route &amp; deviation tracking</span></div>
            <div className="manifest-item"><span className="manifest-code">EOD</span><span className="txt">Day End cash settlement</span></div>
            <div className="manifest-item"><span className="manifest-code">RPT</span><span className="txt">Reports &amp; analytics</span></div>
            <div className="manifest-item"><span className="manifest-code">TAL</span><span className="txt">TallyPrime sync</span></div>
          </div>
        </div>

        <section id="product" className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">What changes</div>
            <h2>Everything that used to live on paper, live on one screen.</h2>
            <p>
              Distribution runs on handwritten challans, phone calls to confirm
              delivery, and cash counted at the end of a long day. Direco keeps the
              same workflow your team already knows — it just stops losing
              information along the way.
            </p>
          </div>

          <div className="features">
            <div className="feature-card reveal">
              <span className="code">PKL — PICKLISTS</span>
              <h3>Picklists, not paper</h3>
              <p>Build a picklist for each route in seconds and push it straight to the delivery agent's phone — no handwritten challans, no re-typing at the godown.</p>
            </div>
            <div className="feature-card reveal">
              <span className="code">GPS — ROUTE TRACKING</span>
              <h3>See the route as it happens</h3>
              <p>Compare the planned route against the actual GPS trail for every delivery, so a detour or a long stop never goes unnoticed.</p>
            </div>
            <div className="feature-card reveal">
              <span className="code">EOD — SETTLEMENT</span>
              <h3>Cash reconciled the same day</h3>
              <p>Every agent settles cash against picklist value before clocking off, with returns and shortfalls logged on the spot — not discovered a week later.</p>
            </div>
            <div className="feature-card reveal">
              <span className="code">RPT — DASHBOARD</span>
              <h3>One dashboard, every route</h3>
              <p>Outstanding payments, agent performance, and delivery status in a single view — instead of five spreadsheets that never quite agree.</p>
            </div>
          </div>
        </section>

        <section id="how" className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">How it works</div>
            <h2>One route, four checkpoints.</h2>
            <p>The same sequence your delivery agents already follow — Direco just keeps a record of it as it happens.</p>
          </div>

          <div className="ledger reveal">
            <div className="ledger-row">
              <div className="stage-code">01 · PKL</div>
              <h4>Picklist created</h4>
              <p>The storekeeper builds a picklist for the route and assigns it to a delivery agent, with quantities pulled straight from stock.</p>
            </div>
            <div className="ledger-row">
              <div className="stage-code">02 · DSP</div>
              <h4>Agent dispatched</h4>
              <p>The agent confirms the load against the picklist and starts the route from their phone — no separate paperwork to carry.</p>
            </div>
            <div className="ledger-row">
              <div className="stage-code">03 · GPS</div>
              <h4>Route tracked</h4>
              <p>GPS logs the actual path stop by stop, laid next to the planned route so any deviation is visible immediately.</p>
            </div>
            <div className="ledger-row">
              <div className="stage-code">04 · EOD</div>
              <h4>Day End settled</h4>
              <p>Cash, returns, and shortfalls are reconciled against the picklist before the agent signs off for the day.</p>
            </div>
          </div>
        </section>

        <section id="integrations" className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">Integrations</div>
            <h2>Every settlement lands in TallyPrime — automatically.</h2>
            <p>Direco doesn't ask you to abandon the books you already keep. Each Day End settlement pushes a matching voucher straight into TallyPrime, so your accountant never re-types a single entry.</p>
          </div>

          <div className="sync-panel reveal">
            <div className="sync-card">
              <div className="sync-label">Direco</div>
              <div className="sync-line">DIRE-00214 settled</div>
              <div className="sync-sub">Cash collected · returns logged</div>
            </div>
            <div className="sync-arrow"><span /><span /><span /></div>
            <div className="sync-card tally">
              <div className="sync-label">TallyPrime</div>
              <div className="sync-line">Sales &amp; receipt voucher created</div>
              <div className="sync-sub">Ledger updated · no manual entry</div>
            </div>
          </div>

          <ul className="sync-list reveal">
            <li><span className="manifest-code">TAL</span> Sales vouchers created per delivery, matched to the picklist</li>
            <li><span className="manifest-code">TAL</span> Receipt vouchers posted the moment a Day End settlement closes</li>
            <li><span className="manifest-code">TAL</span> Stock ledger stays in sync with what actually left the godown</li>
          </ul>
        </section>

        <section id="contact" className="wrap">
          <div className="cta-band reveal">
            <div>
              <h2>Bring your distribution business online.</h2>
              <p>See Direco running on a real route — picklist to Day End settlement — in a 20-minute walkthrough.</p>
            </div>
            <button type="button" className="btn btn-primary">Request a demo</button>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="footer-row">
            <div className="wordmark">DIRECO<span className="dot">.</span></div>
            <div className="footer-links">
              <a href="#product">Product</a>
              <a href="#how">How it works</a>
              <a href="#integrations">Integrations</a>
              <button type="button" className="footer-link-btn">Request a demo</button>
              <Link to="/login">Login</Link>
            </div>
          </div>
          <div className="footer-tag">
            Distributor to Retail Connect — picklists, routes, and settlements in one place.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
