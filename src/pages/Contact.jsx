/**
 * ContactPage Component
 * Secure contact form with validation
 * 
 * Security Features:
 * - Input sanitization
 * - Email validation
 * - Rate limiting ready
 * - XSS protection
 */

import React, { useState, useCallback } from 'react';
import Section from '../components/layout/Section';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { useSecurity } from '../hooks/useSecurity';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ContactPage = () => {
  const {
    sanitizeText,
    validateField,
  } = useSecurity();

  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  // Validation rules
  const validationRules = {
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, type: 'email' },
    subject: { required: true, minLength: 5, maxLength: 200 },
    message: { required: true, minLength: 10, maxLength: 2000 },
  };

  // Handle field change
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const sanitized = sanitizeText(value);
    
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    
    // Validate if already touched
    if (touched[name]) {
      const result = validateField(sanitized, validationRules[name].type || 'text', validationRules[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: result.error,
      }));
    }
  }, [touched, sanitizeText, validateField, validationRules]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    const result = validateField(value, validationRules[name].type || 'text', validationRules[name]);
    setErrors((prev) => ({
      ...prev,
      [name]: result.error,
    }));
  }, [validateField, validationRules]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const rules = validationRules[fieldName];
      const value = formData[fieldName] || '';
      const result = validateField(value, rules.type || 'text', rules);
      
      if (!result.isValid) {
        newErrors[fieldName] = result.error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, validationRules, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      subject: true,
      message: true,
    });

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Simulate API call (replace with actual endpoint)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // In production, send to your backend:
      // await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });

      console.log('Form submitted:', formData);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTouched({});
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  // Contact info
  const contactInfo = [
    {
      icon: 'ri-mail-line',
      title: 'Email',
      value: 'contact@vinzryyysaga.com',
      href: 'mailto:contact@vinzryyysaga.com',
    },
    {
      icon: 'ri-map-pin-line',
      title: 'Location',
      value: 'Kuala Lumpur, Malaysia',
      href: '#',
    },
    {
      icon: 'ri-time-line',
      title: 'Response Time',
      value: 'Within 24-48 hours',
      href: '#',
    },
  ];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <Section id="contact" padding="xl" background="gradient">
        <PageHeader
          title="Get In Touch"
          subtitle="Have a project in mind? Let's discuss how we can bring your vision to life"
        />
      </Section>

      {/* Contact Form Section */}
      <Section padding="lg">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div
            ref={elementRef}
            className={`
              lg:col-span-1 space-y-8
              transform transition-all duration-700
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}
            `}
          >
            <div>
              <h2 className="font-header text-2xl font-bold text-[color:var(--color-text-primary)] mb-4">
                Contact Information
              </h2>
              <p className="text-[color:var(--color-text-secondary)] leading-relaxed">
                Fill out the form and I'll get back to you as soon as possible. 
                For urgent inquiries, feel free to reach out directly.
              </p>
            </div>

            {/* Contact Details */}
            <div className="space-y-6">
              {contactInfo.map((info) => (
                <a
                  key={info.title}
                  href={info.href}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/60 border border-[color:var(--color-bg-tertiary)] flex items-center justify-center group-hover:bg-[color:var(--color-accent)] transition-colors shadow-pastel">
                    <i className={`${info.icon} text-xl text-[color:var(--color-accent)] group-hover:text-white`} />
                  </div>
                  <div>
                    <div className="text-sm text-[color:var(--color-text-light)] mb-1">{info.title}</div>
                    <div className="text-[color:var(--color-text-primary)] font-medium group-hover:text-[color:var(--color-accent-hover)] transition-colors">
                      {info.value}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-[color:var(--color-text-primary)] font-semibold mb-4">Follow Me</h3>
              <div className="flex gap-3">
                {['instagram', 'twitter-x', 'facebook', 'camera'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="
                      w-10 h-10 rounded-lg bg-white/60 border border-[color:var(--color-bg-tertiary)]
                      flex items-center justify-center
                      text-[color:var(--color-text-secondary)] hover:text-white hover:bg-[color:var(--color-accent)]
                      transition-all
                      shadow-pastel
                    "
                    aria-label={social}
                  >
                    <i className={`ri-${social}-line`} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div
            className={`
              lg:col-span-2
              transform transition-all duration-700 delay-200
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
            `}
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-[color:var(--color-bg-tertiary)] shadow-pastel">
              {/* Success Message */}
              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className="ri-checkbox-circle-line text-green-500 text-xl" />
                    <div>
                      <p className="text-green-600 font-medium">Message sent successfully!</p>
                      <p className="text-green-600/70 text-sm">I'll get back to you within 24-48 hours.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className="ri-error-warning-line text-red-500 text-xl" />
                    <div>
                      <p className="text-red-600 font-medium">Failed to send message</p>
                      <p className="text-red-600/70 text-sm">Please try again or contact me directly via email.</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {/* Name & Email Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[color:var(--color-text-primary)] mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      className={`
                        w-full px-4 py-3 bg-white/50 border rounded-lg
                        text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-light)]
                        focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${errors.name && touched.name ? 'border-red-500' : 'border-[color:var(--color-bg-tertiary)]'}
                      `}
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                    {errors.name && touched.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[color:var(--color-text-primary)] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      className={`
                        w-full px-4 py-3 bg-white/50 border rounded-lg
                        text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-light)]
                        focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${errors.email && touched.email ? 'border-red-500' : 'border-[color:var(--color-bg-tertiary)]'}
                      `}
                      placeholder="john@example.com"
                      autoComplete="email"
                    />
                    {errors.email && touched.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[color:var(--color-text-primary)] mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    className={`
                      w-full px-4 py-3 bg-white/50 border rounded-lg
                      text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-light)]
                      focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${errors.subject && touched.subject ? 'border-red-500' : 'border-[color:var(--color-bg-tertiary)]'}
                    `}
                    placeholder="Project Inquiry"
                  />
                  {errors.subject && touched.subject && (
                    <p className="mt-1 text-sm text-red-500">{errors.subject}</p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[color:var(--color-text-primary)] mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    rows={6}
                    className={`
                      w-full px-4 py-3 bg-white/50 border rounded-lg
                      text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-light)]
                      focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      resize-none
                      ${errors.message && touched.message ? 'border-red-500' : 'border-[color:var(--color-bg-tertiary)]'}
                    `}
                    placeholder="Tell me about your project..."
                  />
                  {errors.message && touched.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                  )}
                  <p className="mt-1 text-xs text-[color:var(--color-text-light)] text-right">
                    {formData.message.length}/2000 characters
                  </p>
                </div>

                {/* Submit Button */}
                <div>
                  <Button
                    type="submit"
                    variant="pastel"
                    size="lg"
                    loading={isSubmitting}
                    icon="ri-mail-send-line"
                    className="w-full md:w-auto"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>

                {/* Privacy Notice */}
                <p className="text-xs text-[color:var(--color-text-light)] text-center">
                  By submitting this form, you agree to our privacy policy.
                  Your information will never be shared with third parties.
                </p>
              </form>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
};

export default ContactPage;
