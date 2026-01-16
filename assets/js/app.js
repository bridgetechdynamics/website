const q = (selector, scope = document) => scope.querySelector(selector);
const qa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;
let prefersReducedMotion = motionQuery ? motionQuery.matches : false;
const folderNodes = new Set();

const resetFolderNodes = () => {
  folderNodes.forEach((node) => {
    node.style.setProperty('--tx', '0px');
    node.style.setProperty('--ty', '0px');
    node.style.setProperty('--rot', '0deg');
    node.classList.remove('is-active');
  });
};

const handleMotionPreference = (event) => {
  prefersReducedMotion = event.matches;
  if (event.matches) {
    resetFolderNodes();
  }
};

if (motionQuery) {
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', handleMotionPreference);
  } else if (typeof motionQuery.addListener === 'function') {
    motionQuery.addListener(handleMotionPreference);
  }
}

const initHeroReveal = () => {
  const hero = q('.hero');
  if (!hero) return;
  hero.classList.add('is-ready');
};

const initIntersectionReveals = () => {
  const sections = qa('.js-reveal');
  if (!sections.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  sections.forEach((section) => observer.observe(section));
};

const initFolderTilt = () => {
  const cards = qa('.folder-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -6;
      const rotateY = ((x / rect.width) - 0.5) * 6;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
};

const initFolderCluster = () => {
  const clusters = qa('[data-folder-cluster]');
  if (!clusters.length) return;

  clusters.forEach((cluster) => {
    const nodes = qa('[data-folder]', cluster);
    if (!nodes.length) return;

    nodes.forEach((node) => folderNodes.add(node));

    const scatter = () => {
      if (prefersReducedMotion) {
        resetFolderNodes();
        return;
      }
      nodes.forEach((node) => {
        const depth = Number(node.dataset.depth) || 1;
        const x = (Math.random() - 0.5) * 40 * depth;
        const y = (Math.random() - 0.5) * 30 * depth;
        const rot = (Math.random() - 0.5) * 18;
        node.style.setProperty('--tx', `${x}px`);
        node.style.setProperty('--ty', `${y}px`);
        node.style.setProperty('--rot', `${rot}deg`);
        node.classList.add('is-active');
      });
    };

    const regroup = () => {
      nodes.forEach((node) => {
        node.style.setProperty('--tx', '0px');
        node.style.setProperty('--ty', '0px');
        node.style.setProperty('--rot', '0deg');
        node.classList.remove('is-active');
      });
    };

    cluster.addEventListener('pointerenter', scatter);
    cluster.addEventListener('pointerleave', regroup);
    cluster.addEventListener('focusin', scatter);
    cluster.addEventListener('focusout', (event) => {
      if (!cluster.contains(event.relatedTarget)) {
        regroup();
      }
    });
  });
};

const validateField = (input) => {
  let message = '';
  const value = input.value.trim();
  const isRequired = input.hasAttribute('required');

  if (input.type === 'email' && value) {
    const emailPattern = /.+@.+\..+/;
    if (!emailPattern.test(value)) {
      message = 'Please enter a valid email address.';
    }
  }

  if (isRequired && !value) {
    message = `${input.getAttribute('data-label') || 'This field'} is required.`;
  }

  return message;
};

const renderFormStatus = (form, message, success = false) => {
  let status = form.querySelector('.form-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.prepend(status);
  }
  status.textContent = message;
  status.classList.toggle('success-message', success);
  status.classList.toggle('error-message', !success);
};

const updateFieldState = (input, form) => {
  const error = validateField(input);
  const errorEl = q(`#${input.id}-error`, form);

  if (error) {
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) errorEl.textContent = error;
    return false;
  }

  input.removeAttribute('aria-invalid');
  if (errorEl) errorEl.textContent = '';
  return true;
};

const buildPayload = (form) => {
  const formData = new FormData(form);
  const getVal = (name) => (formData.get(name) || '').toString().trim();
  const serviceValue = getVal('service') || getVal('budget') || form.dataset.serviceDefault || '';

  return {
    name: getVal('name'),
    email: getVal('email'),
    company: getVal('company'),
    service: serviceValue,
    message: getVal('message'),
    trap: getVal('trap'),
    recaptcha_token: getVal('recaptcha_token')
  };
};

const submitQuoteRequest = async (form) => {
  const endpoint = form.dataset.apiEndpoint || '/api/quote';
  const submitButton = form.querySelector('[type="submit"]');
  submitButton?.setAttribute('disabled', 'disabled');
  form.classList.add('is-submitting');
  renderFormStatus(form, 'Sending…');

  const payload = buildPayload(form);
  if (!payload.service) {
    payload.service = 'General Inquiry';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Unable to send your request right now.');
    }
    renderFormStatus(form, form.dataset.successMessage || 'Thanks! Your message has been sent. Expect a response soon.', true);
    form.reset();
  } catch (error) {
    renderFormStatus(form, error.message || 'Network error. Please try again later.', false);
  } finally {
    submitButton?.removeAttribute('disabled');
    form.classList.remove('is-submitting');
  }
};

const initForms = () => {
  const forms = qa('form.needs-validation');
  if (!forms.length) return;

  forms.forEach((form) => {
    const inputs = qa('input, textarea, select', form);

    inputs.forEach((input) => {
      const validate = () => updateFieldState(input, form);
      input.addEventListener('blur', validate);
      input.addEventListener('input', validate);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const allValid = inputs.every((input) => updateFieldState(input, form));
      if (!allValid) {
        renderFormStatus(form, 'Please fix the errors before submitting.', false);
        return;
      }

      await submitQuoteRequest(form);
    });
  });
};

const init = () => {
  initHeroReveal();
  initIntersectionReveals();
  initFolderTilt();
  initFolderCluster();
  initForms();
};

document.addEventListener('DOMContentLoaded', init);
