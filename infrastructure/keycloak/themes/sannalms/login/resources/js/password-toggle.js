document.addEventListener('DOMContentLoaded', function () {
  function initPasswordToggles() {
    var passwordInputs = document.querySelectorAll('input[type="password"], input[data-has-toggle="true"]');
    
    passwordInputs.forEach(function (input) {
      if (input.dataset.toggleInitialized) return;
      input.dataset.toggleInitialized = 'true';

      // Create a wrapper if parent is not already relative
      var parent = input.parentElement;
      if (!parent.classList.contains('password-input-wrapper')) {
        var wrapper = document.createElement('div');
        wrapper.className = 'password-input-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'block';
        wrapper.style.width = '100%';
        parent.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        parent = wrapper;
      }

      // Create toggle button
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'password-toggle-btn';
      btn.setAttribute('aria-label', 'Toggle password visibility');
      btn.style.position = 'absolute';
      btn.style.right = '12px';
      btn.style.top = '50%';
      btn.style.transform = 'translateY(-50%)';
      btn.style.background = 'transparent';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.padding = '4px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.color = '#94a3b8';
      btn.style.zIndex = '10';

      var eyeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      var eyeOffSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

      btn.innerHTML = eyeSvg;

      input.style.paddingRight = '42px';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (input.type === 'password') {
          input.type = 'text';
          btn.innerHTML = eyeOffSvg;
          btn.style.color = '#6366f1';
        } else {
          input.type = 'password';
          btn.innerHTML = eyeSvg;
          btn.style.color = '#94a3b8';
        }
      });

      parent.appendChild(btn);
    });
  }

  initPasswordToggles();
  setTimeout(initPasswordToggles, 500);
});
