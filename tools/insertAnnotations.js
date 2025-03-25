"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertAnnotations = void 0;
const insertAnnotations = (htmlContent, particles) => {
    // First, let's create a script that will render the particles
    const particlesScript = `
<script>
  (function() {
    // Serialize particles data to make it available for our script
    const particlesData = ${JSON.stringify(particles)};
    
    // Function to render a single particle element
    function renderParticle(pageElement, particle) {
      const elementDiv = document.createElement('div');
      elementDiv.id = particle.id;
      elementDiv.className = particle.className || '';
      elementDiv.setAttribute('data-type', 'particle');
      
      // Set position and size
      Object.assign(elementDiv.style, particle.style || {});
      elementDiv.style.position = 'absolute';
      
      const position = particle.position || { x: 0, y: 0 };
      elementDiv.style.transform = \`translate(\${position.x}px, \${position.y}px)\`;
      
      if (particle.size) {
        elementDiv.style.width = \`\${particle.size.width}px\`;
        elementDiv.style.height = \`\${particle.size.height}px\`;
      }
      
      // Handle different element types
      switch (particle.type) {
        case 'drawing':
          elementDiv.innerHTML = particle.content;
          break;
          
        case 'image':
          const img = document.createElement('img');
          img.src = particle.content;
          img.alt = 'Annotation image';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          elementDiv.appendChild(img);
          break;
          
        case 'shape':
          const shapeDiv = document.createElement('div');
          shapeDiv.innerHTML = particle.content;
          shapeDiv.className = 'absolute-fwh';
          elementDiv.appendChild(shapeDiv);
          break;
          
        default:
          // Default is text content
          elementDiv.textContent = particle.content;
          break;
      }
      
      // Add to page
      pageElement.appendChild(elementDiv);
    }
    
    // Function to render all particles for a specific page
    function renderParticlesForPage(pageId) {
      const pageElement = document.getElementById(pageId);
      if (!pageElement) return;
      
      // Get particles for this page
      const pageParticles = particlesData[pageId] || [];
      if (!pageParticles.length) return;
      
      // Make sure the page has relative positioning for absolute positioned children
      if (getComputedStyle(pageElement).position === 'static') {
        pageElement.style.position = 'relative';
      }
      
      // Render each particle
      pageParticles.forEach(particle => {
        renderParticle(pageElement, particle);
      });
    }
    
    // Find all page elements and render particles for each
    function initializeAnnotations() {
      // Process each page that has particles
      Object.keys(particlesData).forEach(pageId => {
        renderParticlesForPage(pageId);
      });
    }
    
    // Initialize when the DOM is fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeAnnotations);
    } else {
      initializeAnnotations();
    }
  })();
</script>
  `;
    // Insert the script before the closing </body> tag
    if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', `${particlesScript}</body>`);
    }
    else {
        // If there's no body tag, append to the end
        return htmlContent + particlesScript;
    }
};
exports.insertAnnotations = insertAnnotations;
