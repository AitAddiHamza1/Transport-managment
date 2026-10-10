import React, { useState } from 'react';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useLandingI18n } from '../context/LandingI18nContext';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export const ContactSection: React.FC = () => {
  const { t, language } = useLandingI18n();

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const phoneDisplay = '0720201139';
  const whatsappUrl = 'https://wa.me/212720201139';
  const telUrl = 'tel:+212720201139';
  const emailAddress = 'transivo03@gmail.com';

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = language === 'ar' ? 'يرجى إدخال الاسم الكامل' : language === 'en' ? 'Full name is required' : 'Le nom complet est obligatoire';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = language === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح' : language === 'en' ? 'Valid email is required' : 'Une adresse email valide est obligatoire';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = language === 'ar' ? 'يرجى تحديد موضوع الرسالة' : language === 'en' ? 'Subject is required' : 'Le sujet est obligatoire';
    }
    if (!formData.message.trim() || formData.message.trim().length < 5) {
      newErrors.message = language === 'ar' ? 'يرجى كتابة نص الرسالة' : language === 'en' ? 'Message is required' : 'Le message est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessDialogOpen(true);
    }, 400);
  };

  const getMailtoUrl = () => {
    const subjectPrefix = language === 'ar' ? '[ترانسيفو - تواصل]' : language === 'en' ? '[Transivo Contact]' : '[Transivo Contact]';
    const subject = encodeURIComponent(`${subjectPrefix} ${formData.subject || 'Demande de contact'}`);
    const bodyContent =
      language === 'ar'
        ? `الاسم الكامل: ${formData.name}\nالبريد الإلكتروني: ${formData.email}\nرقم الهاتف: ${formData.phone || 'غير محدد'}\nالموضوع: ${formData.subject}\n\nنص الرسالة:\n${formData.message}`
        : language === 'en'
        ? `Full Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone || 'Not provided'}\nSubject: ${formData.subject}\n\nMessage:\n${formData.message}`
        : `Nom complet : ${formData.name}\nEmail : ${formData.email}\nTéléphone : ${formData.phone || 'Non renseigné'}\nSujet : ${formData.subject}\n\nMessage :\n${formData.message}`;
    return `mailto:${emailAddress}?subject=${subject}&body=${encodeURIComponent(bodyContent)}`;
  };

  const getWhatsAppPrefilledUrl = () => {
    const textContent =
      language === 'ar'
        ? `مرحباً ترانسيفو،\nالاسم: ${formData.name}\nالبريد الإلكتروني: ${formData.email}\nالهاتف: ${formData.phone || 'غير محدد'}\nالموضوع: ${formData.subject}\n\nالرسالة:\n${formData.message}`
        : language === 'en'
        ? `Hello Transivo,\nName: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone || 'Not provided'}\nSubject: ${formData.subject}\n\nMessage:\n${formData.message}`
        : `Bonjour Transivo,\nNom : ${formData.name}\nEmail : ${formData.email}\nTéléphone : ${formData.phone || 'Non renseigné'}\nSujet : ${formData.subject}\n\nMessage :\n${formData.message}`;
    return `https://wa.me/212720201139?text=${encodeURIComponent(textContent)}`;
  };

  return (
    <section id="contact" className="transivo-section transivo-contact-section">
      <div className="landing-container">
        <div className="transivo-contact-grid">
          {/* Left Column: Direct Coordinates */}
          <div className="contact-info-col">
            <span className="transivo-section-badge">{t.contact.eyebrow}</span>
            <h2 className="transivo-section-title">{t.contact.title}</h2>
            <p className="contact-info-subtitle">{t.contact.subtitle}</p>

            <div className="contact-methods-list">
              {/* WhatsApp Item */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-method-card"
                aria-label={`WhatsApp: ${phoneDisplay}`}
              >
                <div className="contact-icon-bubble whatsapp-bubble">
                  <WhatsAppIcon style={{ fontSize: 24 }} />
                </div>
                <div>
                  <div className="method-label">{t.contact.whatsappLabel}</div>
                  <div className="method-value" dir="ltr">{phoneDisplay}</div>
                </div>
              </a>

              {/* Direct Phone Call */}
              <a
                href={telUrl}
                className="contact-method-card"
                aria-label={`Téléphone: ${phoneDisplay}`}
              >
                <div className="contact-icon-bubble phone-bubble">
                  <PhoneIcon style={{ fontSize: 24 }} />
                </div>
                <div>
                  <div className="method-label">{t.contact.phoneLabel}</div>
                  <div className="method-value" dir="ltr">{phoneDisplay}</div>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:${emailAddress}`}
                className="contact-method-card"
                aria-label={`Email: ${emailAddress}`}
              >
                <div className="contact-icon-bubble email-bubble">
                  <EmailIcon style={{ fontSize: 24 }} />
                </div>
                <div>
                  <div className="method-label">{t.contact.emailLabel}</div>
                  <div className="method-value" dir="ltr">{emailAddress}</div>
                </div>
              </a>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="contact-form-col">
            <div className="contact-form-card">
              <h3 className="form-card-title">{t.contact.form.title}</h3>

              <form onSubmit={handleSubmit} noValidate className="transivo-form">
                <div className="form-grid-2">
                  {/* Full Name */}
                  <div className="form-field">
                    <label htmlFor="contact-name" className="field-label">
                      {t.contact.form.nameLabel} <span className="req-star">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      className={`field-input ${errors.name ? 'input-error' : ''}`}
                      placeholder={t.contact.form.namePlaceholder}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    {errors.name && <span className="field-error-text">{errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="form-field">
                    <label htmlFor="contact-email" className="field-label">
                      {t.contact.form.emailLabel} <span className="req-star">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className={`field-input ${errors.email ? 'input-error' : ''}`}
                      placeholder={t.contact.form.emailPlaceholder}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                    {errors.email && <span className="field-error-text">{errors.email}</span>}
                  </div>
                </div>

                <div className="form-grid-2">
                  {/* Phone (Optional) */}
                  <div className="form-field">
                    <label htmlFor="contact-phone" className="field-label">
                      {t.contact.form.phoneLabel}
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      className="field-input"
                      placeholder={t.contact.form.phonePlaceholder}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {/* Subject */}
                  <div className="form-field">
                    <label htmlFor="contact-subject" className="field-label">
                      {t.contact.form.subjectLabel} <span className="req-star">*</span>
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      className={`field-input ${errors.subject ? 'input-error' : ''}`}
                      placeholder={t.contact.form.subjectPlaceholder}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                    {errors.subject && <span className="field-error-text">{errors.subject}</span>}
                  </div>
                </div>

                {/* Message */}
                <div className="form-field">
                  <label htmlFor="contact-message" className="field-label">
                    {t.contact.form.messageLabel} <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    className={`field-textarea ${errors.message ? 'input-error' : ''}`}
                    placeholder={t.contact.form.messagePlaceholder}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                  {errors.message && <span className="field-error-text">{errors.message}</span>}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="landing-btn hero-btn-whatsapp w-full form-submit-btn"
                  disabled={isSubmitting}
                >
                  <SendIcon className="rtl-mirror" style={{ fontSize: 18 }} />
                  <span>{isSubmitting ? t.contact.form.submitting : t.contact.form.submitBtn}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Action Confirmation Dialog */}
      {successDialogOpen && (
        <div className="transivo-modal-overlay" onClick={() => setSuccessDialogOpen(false)} role="dialog" aria-modal="true">
          <div className="transivo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="transivo-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircleIcon style={{ color: 'var(--transivo-cyan)', fontSize: 28 }} />
                <h3 className="transivo-modal-title">{t.contact.form.dialogTitle}</h3>
              </div>
              <button
                className="transivo-modal-close"
                onClick={() => setSuccessDialogOpen(false)}
                aria-label={t.contact.form.closeDialog}
              >
                <CloseIcon />
              </button>
            </div>

            <p style={{ color: 'var(--transivo-text-muted)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {t.contact.form.dialogDesc}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <a
                href={getWhatsAppPrefilledUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn hero-btn-whatsapp"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setSuccessDialogOpen(false)}
              >
                <WhatsAppIcon style={{ fontSize: 20 }} />
                <span>{t.contact.form.sendViaWhatsapp}</span>
                <OpenInNewIcon style={{ fontSize: 16 }} />
              </a>

              <a
                href={getMailtoUrl()}
                className="landing-btn landing-btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setSuccessDialogOpen(false)}
              >
                <EmailIcon style={{ fontSize: 18 }} />
                <span>{t.contact.form.sendViaEmail}</span>
                <OpenInNewIcon style={{ fontSize: 16 }} />
              </a>

              <button
                type="button"
                className="landing-btn landing-btn-subtle"
                style={{ alignSelf: 'center', marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--transivo-text-muted)' }}
                onClick={() => setSuccessDialogOpen(false)}
              >
                {t.contact.form.closeDialog}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactSection;
