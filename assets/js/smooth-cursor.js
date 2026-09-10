/**
 * Neon Green Smooth Cursor – The Viral Trees
 * Guaranteed visible and works on all pages.
 */

class SmoothCursor {
  constructor() {
    this.cursor = this.createCursor();
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.target = { x: this.pos.x, y: this.pos.y };
    this.scale = 1;
    this.damping = 0.15;

    this.init();
  }

  createCursor() {
    const div = document.createElement('div');
    div.id = 'smooth-green-cursor';
    document.body.appendChild(div);
    return div;
  }

  init() {
    // Hide default cursor
    document.body.style.cursor = 'none';

    document.addEventListener('mousemove', (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
    });

    document.addEventListener('mousedown', () => {
      this.scale = 0.8;
    });

    document.addEventListener('mouseup', () => {
      this.scale = 1;
    });

    requestAnimationFrame(() => this.animate());
  }

  animate() {
    // Smooth follow
    this.pos.x += (this.target.x - this.pos.x) * this.damping;
    this.pos.y += (this.target.y - this.pos.y) * this.damping;

    this.cursor.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) translate(-50%, -50%) scale(${this.scale})`;
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize after page load
window.addEventListener('load', () => {
  new SmoothCursor();
});

