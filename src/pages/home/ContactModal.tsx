import React, { useEffect, useRef, useState } from "react";
import { saveContactLead } from "../../services/leadService";
import "./ContactModal.css";

/**
 * Contact / "Request a demo" popup, ported from the static direco-contact.html.
 *
 * Every landing-page link except Login opens this. Submitting POSTs to
 * /api/leads (public endpoint) and only shows the confirmation once the server
 * has actually stored the enquiry — a failure keeps the form and its values so
 * nothing the visitor typed is lost.
 */

const randomEnquiryId = () =>
  "ENQ-" + String(Math.floor(Math.random() * 9000) + 1000).padStart(5, "0");

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ open, onClose }) => {
  const [enquiryId, setEnquiryId] = useState(randomEnquiryId);
  const [sent, setSent]           = useState(false);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");
  const formRef                   = useRef<HTMLFormElement>(null);
  const dialogRef                 = useRef<HTMLDivElement>(null);

  /* Close on Escape, and lock background scrolling while open */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  /* Fresh enquiry number each time the popup is opened */
  useEffect(() => {
    if (open) {
      setSent(false);
      setSending(false);
      setError("");
      setEnquiryId(randomEnquiryId());
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form?.reportValidity()) return;

    const value = (n: string) =>
      (form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() ?? "";

    const routes = value("routes");
    setSending(true);
    setError("");
    try {
      const res = await saveContactLead({
        enquiryId,
        name:         value("name"),
        business:     value("business"),
        phone:        value("phone"),
        email:        value("email"),
        routesPerDay: routes === "" ? null : Number(routes),
        message:      value("message"),
      });
      // Only confirm once the server says it stored the enquiry
      if (res?.saved) setSent(true);
      else setError(res?.error || "Could not send your details. Please try again.");
    } catch (err) {
      setError(
        (err as { message?: string })?.message ||
        "Could not send your details. Please check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const sendAnother = () => {
    formRef.current?.reset();
    setSent(false);
    setError("");
    setEnquiryId(randomEnquiryId());
  };

  return (
    <div
      className="direco-contact-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="direco-contact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="direco-contact-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button
          type="button"
          className="contact-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="contact-grid">
          {/* ── Left column ── */}
          <div className="contact-intro">
            <div className="eyebrow">Get in touch</div>
            <h1 id="direco-contact-title">Tell us about your routes.</h1>
            <p className="lead">
              Share a few details about your distribution business and we'll walk
              you through Direco against a route that looks like yours — picklists,
              GPS tracking, Day End settlement, and TallyPrime sync included.
            </p>

            <div className="next-steps">
              <div className="next-row">
                <div className="next-code">01 · RVW</div>
                <div className="next-copy">
                  <h4>We review your routes</h4>
                  <p>A quick look at how picklists, deliveries, and settlements run for your business today.</p>
                </div>
              </div>
              <div className="next-row">
                <div className="next-code">02 · DEMO</div>
                <div className="next-copy">
                  <h4>We walk you through Direco</h4>
                  <p>A short session on your own numbers — routes, agents, and TallyPrime sync included.</p>
                </div>
              </div>
              <div className="next-row">
                <div className="next-code">03 · GO</div>
                <div className="next-copy">
                  <h4>You decide if it fits</h4>
                  <p>No long pilot contracts — start with the modules that matter to your business first.</p>
                </div>
              </div>
            </div>

            <div className="direct-line">
              <div className="direct-label">Prefer to talk?</div>
              <div className="direct-number">+91 95352 05051</div>
              <div className="direct-actions">
                <a href="tel:+919535205051" className="btn btn-ghost">Call</a>
                <a
                  href="https://wa.me/919535205051"
                  className="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* ── Form card ── */}
          <div className="form-stage">
            <div className="carbon-copy blue" />
            <div className="carbon-copy pink" />

            <div className="form-card">
              <div className="form-head">
                <div>
                  <div className="label">Enquiry</div>
                  <div className="id">{enquiryId}</div>
                </div>
                <div className="badge">New lead</div>
              </div>

              {!sent && (
                <form ref={formRef} className="form-fields" noValidate onSubmit={handleSubmit}>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="fName">Name</label>
                      <input type="text" id="fName" name="name" placeholder="Your full name" required />
                    </div>
                    <div className="field">
                      <label htmlFor="fBusiness">Business name</label>
                      <input type="text" id="fBusiness" name="business" placeholder="Distribution business name" required />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="fPhone">Phone</label>
                      <input type="tel" id="fPhone" name="phone" placeholder="10-digit mobile number" required />
                    </div>
                    <div className="field">
                      <label htmlFor="fEmail">Email</label>
                      <input type="email" id="fEmail" name="email" placeholder="you@business.com" required />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="fRoutes">Delivery agents / day</label>
                    <input type="number" id="fRoutes" name="routes" placeholder="e.g. 6" min="0" />
                  </div>

                  <div className="field">
                    <label htmlFor="fMessage">Anything specific to look at?</label>
                    <textarea id="fMessage" name="message" placeholder="Route tracking, Day End settlement, TallyPrime sync…" />
                  </div>

                  {error && <div className="form-error" role="alert">{error}</div>}

                  <div className="form-foot">
                    <span className="fine">We'll get back to you shortly.</span>
                    <button type="submit" className="btn btn-primary" disabled={sending}>
                      {sending ? "Sending…" : "Send details"}
                    </button>
                  </div>
                </form>
              )}

              {sent && (
                <div className="success-panel">
                  <div className="stamp-mark">RECEIVED</div>
                  <h3>Details sent.</h3>
                  <p>We've logged your enquiry and will get back to you shortly with a time for a walkthrough.</p>
                  <button type="button" className="btn btn-ghost" onClick={sendAnother}>Send another</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
