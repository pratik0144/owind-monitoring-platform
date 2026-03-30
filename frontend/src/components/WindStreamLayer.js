/**
 * WindStreamLayer - SimScale-style animated wind streamlines
 * Full viewport coverage with velocity-based coloring
 */

class WindStreamLayer {
  constructor(map) {
    this.map = map;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.windVector = { x: 0, y: 0 };
    this.windSpeed = 0;
    this.isActive = false;
    this.center = null;
    this.frame = 0;
    
    // Grid of particles across viewport
    this.gridRows = 25;
    this.gridCols = 30;
    this.particleTrailLength = 20;
    
    this.createCanvas();
  }

  createCanvas() {
    // Always use Mapbox's canvas container for proper overlay
    const container = document.querySelector('.mapboxgl-canvas-container');
    
    if (!container) {
      console.warn('Mapbox canvas container not found');
      return;
    }

    // Remove existing canvas if present
    const existing = document.getElementById('wind-stream-canvas');
    if (existing) existing.remove();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'wind-stream-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1';
    this.canvas.style.background = 'transparent';
    
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Update on map move
    this.map.on('move', () => {
      if (this.isActive) this.resize();
    });
  }

  resize() {
    if (!this.canvas || !this.map) return;
    
    const mapCanvas = this.map.getCanvas();
    this.canvas.width = mapCanvas.width;
    this.canvas.height = mapCanvas.height;
    this.canvas.style.width = mapCanvas.style.width;
    this.canvas.style.height = mapCanvas.style.height;
    
    if (this.isActive) {
      this.initParticles();
    }
  }

  setWind(windSpeed, windDirection, center) {
    this.windSpeed = windSpeed;
    this.center = center;
    
    // Convert meteorological direction to movement vector
    const dirRad = ((windDirection + 180) % 360) * (Math.PI / 180);
    this.windVector = {
      x: Math.sin(dirRad),
      y: -Math.cos(dirRad)
    };
    
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    
    if (!this.canvas) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Create grid of particles across entire viewport
    const cellWidth = width / this.gridCols;
    const cellHeight = height / this.gridRows;
    
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        // Random position within cell for natural look
        const x = col * cellWidth + Math.random() * cellWidth;
        const y = row * cellHeight + Math.random() * cellHeight;
        
        this.particles.push({
          x,
          y,
          trail: [],
          speed: 0.7 + Math.random() * 0.6,
          age: Math.random() * 100 // Stagger initial ages
        });
      }
    }
  }

  // Wrap particle to opposite edge when leaving bounds
  wrapParticle(particle, width, height) {
    const margin = 50;
    
    if (particle.x < -margin) {
      particle.x = width + margin;
      particle.trail = [];
    } else if (particle.x > width + margin) {
      particle.x = -margin;
      particle.trail = [];
    }
    
    if (particle.y < -margin) {
      particle.y = height + margin;
      particle.trail = [];
    } else if (particle.y > height + margin) {
      particle.y = -margin;
      particle.trail = [];
    }
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.frame = 0;
    this.animate();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  clear() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  animate() {
    if (!this.isActive) return;
    
    this.frame++;
    this.updateParticles();
    this.draw();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  updateParticles() {
    if (!this.canvas) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const baseSpeed = 2 + this.windSpeed * 0.5;
    
    this.particles.forEach(particle => {
      // Store current position in trail
      particle.trail.push({ x: particle.x, y: particle.y });
      
      // Limit trail length
      if (particle.trail.length > this.particleTrailLength) {
        particle.trail.shift();
      }
      
      // Add slight turbulence for realistic flow
      const turbulence = Math.sin(particle.age * 0.05) * 0.3;
      
      // Move particle along wind direction
      particle.x += this.windVector.x * baseSpeed * particle.speed + turbulence;
      particle.y += this.windVector.y * baseSpeed * particle.speed + turbulence * 0.5;
      particle.age++;
      
      // Wrap to opposite edge
      this.wrapParticle(particle, width, height);
    });
  }

  // Get color based on wind speed
  getWindColor(alpha = 1) {
    if (this.windSpeed < 4) {
      // Light blue for low wind
      return `rgba(135, 206, 250, ${alpha})`; // Light sky blue
    } else if (this.windSpeed <= 7) {
      // Medium blue
      return `rgba(59, 130, 246, ${alpha})`; // Blue-500
    } else {
      // Dark blue for strong wind
      return `rgba(30, 64, 175, ${alpha})`; // Blue-800
    }
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      const trail = particle.trail;
      if (trail.length < 2) return;
      
      // Draw trail with gradient fade
      this.ctx.beginPath();
      this.ctx.moveTo(trail[0].x, trail[0].y);
      
      // Smooth curve through trail points
      for (let i = 1; i < trail.length - 1; i++) {
        const xc = (trail[i].x + trail[i + 1].x) / 2;
        const yc = (trail[i].y + trail[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
      }
      
      // Connect to current position
      this.ctx.lineTo(particle.x, particle.y);
      
      // Create gradient along trail
      const gradient = this.ctx.createLinearGradient(
        trail[0].x, trail[0].y,
        particle.x, particle.y
      );
      gradient.addColorStop(0, this.getWindColor(0));
      gradient.addColorStop(0.5, this.getWindColor(0.4));
      gradient.addColorStop(1, this.getWindColor(0.8));
      
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 1.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
      
      // Draw arrowhead at particle head
      this.drawArrowhead(particle);
    });
  }

  drawArrowhead(particle) {
    const trail = particle.trail;
    if (trail.length < 2) return;
    
    // Get direction from last two points
    const last = trail[trail.length - 1];
    const dx = particle.x - last.x;
    const dy = particle.y - last.y;
    const angle = Math.atan2(dy, dx);
    
    const arrowSize = 5;
    
    this.ctx.beginPath();
    this.ctx.moveTo(particle.x, particle.y);
    this.ctx.lineTo(
      particle.x - arrowSize * Math.cos(angle - Math.PI / 6),
      particle.y - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(particle.x, particle.y);
    this.ctx.lineTo(
      particle.x - arrowSize * Math.cos(angle + Math.PI / 6),
      particle.y - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    
    this.ctx.strokeStyle = this.getWindColor(0.9);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

export default WindStreamLayer;
