(async () => {
  const app = new PIXI.Application({
    resizeTo: window,
    backgroundAlpha: 0,
  });

  await app.init();
  document.body.appendChild(app.canvas);

  // Constants
  const BALLOON_COUNT = 10;
  const PUMP_X = app.screen.width - 180;
  const PUMP_Y = app.screen.height - 180;
  const BALLOON_START_X = 415;
  const BALLOON_START_Y = 300;
  const INITIAL_SCALE = 0.1;  // Increased initial scale
  const INFLATION_SPEED = 0.01;
  const MAX_SCALE = 1.2; // Balloon bursts if it reaches this size
  const STRING_OFFSET_Y = 25;
  const COLOR_CHANGE_INTERVAL = 30;
  const SCORE_POSITION_X = 20;
  const SCORE_POSITION_Y = 20;
  const BURST_PARTICLE_COUNT = 20;
  const BURST_PARTICLE_SPEED = 5;

  const balloonTextures = [];
  for (let i = 1; i <= BALLOON_COUNT; i++) {
    balloonTextures.push(`assets/B${i}.png`);
  }

  await PIXI.Assets.load([
    ...balloonTextures,
    "assets/background.png",
    "assets/string.png",
    "assets/pump_body.png",
    "assets/pump_top.png",
    "assets/pump_out.png",
    "assets/pop.mp3",
  ]);

  // 🌄 Background
  const background = PIXI.Sprite.from("assets/background.png");
  background.width = app.screen.width;
  background.height = app.screen.height;
  app.stage.addChildAt(background, 0);

  window.addEventListener("resize", () => {
    background.width = app.screen.width;
    background.height = app.screen.height;
  });

  // 🧯 Pump setup
  const pumpContainer = new PIXI.Container();
  pumpContainer.x = PUMP_X;
  pumpContainer.y = PUMP_Y;

  const pumpTop = PIXI.Sprite.from("assets/pump_top.png");
  pumpTop.anchor.set(0.5);
  pumpTop.y = -167;
  pumpTop.scale.set(0.5);

  const pumpOut = PIXI.Sprite.from("assets/pump_out.png");
  pumpOut.anchor.set(0.5);
  pumpOut.y = -25;
  pumpOut.x = -140;
  pumpOut.scale.set(0.5);

  const pumpBody = PIXI.Sprite.from("assets/pump_body.png");
  pumpBody.anchor.set(0.5);
  pumpBody.scale.set(0.5);

  // Body drawn last to appear in front
  pumpContainer.addChild(pumpTop, pumpOut, pumpBody);
  app.stage.addChild(pumpContainer);

  pumpContainer.eventMode = "static";
  pumpContainer.cursor = "pointer";

  let isInflating = false;
  let currentBalloon = null;
  let scale = INITIAL_SCALE;
  let inflateInterval = null;
  let score = 0;

  // Score Display
  const scoreText = new PIXI.Text(`Score: ${score}`, {
    fontSize: 24,
    fill: 0x000000,
    fontWeight: "bold",
  });
  scoreText.x = SCORE_POSITION_X;
  scoreText.y = SCORE_POSITION_Y;
  app.stage.addChild(scoreText);

  // Function to create a new balloon
  function createBalloon() {
    const index = Math.floor(Math.random() * BALLOON_COUNT) + 1;
    const balloon = PIXI.Sprite.from(`assets/B${index}.png`);
    balloon.anchor.set(0.5);
    balloon.scale.set(INITIAL_SCALE);   // Use INITIAL_SCALE here as well
    balloon.x = BALLOON_START_X;
    balloon.y = BALLOON_START_Y;
    balloon.eventMode = 'static'; // Make it interactive
    balloon.cursor = 'pointer';
    return balloon;
  }

  // Function to start inflating the balloon
  function startInflating() {
    inflateInterval = setInterval(() => {
      scale += INFLATION_SPEED;
      if (currentBalloon) {
        currentBalloon.scale.set(scale);
        if (scale >= MAX_SCALE) {
          // Stop inflating when max scale is reached
          clearInterval(inflateInterval);
          isInflating = false;
        }
      }
    }, 50);
  }

  // Function to handle balloon bursting
  function burstBalloon(balloon, alphabet, string) {
    if (!balloon) return;

    const x = balloon.x;
    const y = balloon.y;

    playPopSound();
    createBurstParticles(x, y, balloon.tint);
    app.stage.removeChild(balloon, alphabet, string);
    clearInterval(inflateInterval);
    currentBalloon = null;
    scale = INITIAL_SCALE;

    // Update score
    score++;
    scoreText.text = `Score: ${score}`;
  }

  // Burst animation
  function createBurstParticles(x, y, color) {
    for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(color);
      particle.drawCircle(0, 0, 3); // Small circle
      particle.endFill();
      particle.x = x;
      particle.y = y;
      app.stage.addChild(particle);

      const angle = Math.random() * Math.PI * 2; // Random angle
      const speed = BURST_PARTICLE_SPEED;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      // Animate the particle
      gsap.to(particle, {
        duration: 0.5,
        x: x + vx * 10,
        y: y + vy * 10,
        alpha: 0,
        onComplete: () => {
          app.stage.removeChild(particle);
        },
      });
    }
  }

  pumpContainer.on("pointerdown", () => {
    if (isInflating) return;
    animatePump(pumpTop, pumpBody, pumpOut);

    isInflating = true;

    // 🎈 This block is where the balloon is generated
    currentBalloon = createBalloon();
    app.stage.addChild(currentBalloon);

    // 🪄 This is where inflation starts happening gradually
    startInflating();
  });

  pumpContainer.on("pointerup", () => {
    if (!isInflating) return;
    isInflating = false;
    clearInterval(inflateInterval);

    if (currentBalloon) {
      const balloon = currentBalloon;
      const x = balloon.x;
      const y = balloon.y;

      const alphabet = new PIXI.Text(getRandomLetter(), {
        fontSize: 40,
        fill: 0xffffff,
        fontWeight: "bold",
      });
      alphabet.anchor.set(0.5);
      alphabet.x = x;
      alphabet.y = y;

      const string = PIXI.Sprite.from("assets/string.png");
      string.anchor.set(0.5, 0);
      string.x = x;
      string.y = y + 15;
      string.scale.set(scale);

      app.stage.addChild(alphabet, string);
      animate(app, balloon, alphabet, string);

      // Add click event to the balloon
      balloon.on('pointerdown', () => {
        burstBalloon(balloon, alphabet, string);
      });
    }

    scale = INITIAL_SCALE;
    currentBalloon = null;
  });

  // 🔄 Pump animation for all parts
  function animatePump(pumpTop, pumpBody, pumpOut) {
    const downY = 90; // How far to press down
    const duration = 0.1;
  
    // Animate down
    gsap.to(pumpTop, { y: pumpTop.y + downY, duration, onComplete: () => {
      // Animate up after down is complete
      gsap.to(pumpTop, { y: pumpTop.y - downY, duration });
    }});
  
    gsap.to(pumpBody, { y: pumpBody.y + downY * 0.5, duration, onComplete: () => {
      gsap.to(pumpBody, { y: pumpBody.y - downY * 0.5, duration });
    }});
  
    gsap.to(pumpOut, { y: pumpOut.y + downY * 0.3, duration, onComplete: () => {
      gsap.to(pumpOut, { y: pumpOut.y - downY * 0.3, duration });
    }});
  }
  

  // 🔤 Random A-Z
  function getRandomLetter() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  // 💨 Balloon flight and color cycle
  function animate(app, balloon, alphabet, string) {
    const speedX = (Math.random() - 0.5) * 4;
    const speedY = (Math.random() - 0.7) * 4;
    let colorChangeTimer = 0;

    const update = () => {
      balloon.x += speedX;
      balloon.y += speedY;
      alphabet.x = balloon.x;
      alphabet.y = balloon.y;
      string.x = balloon.x;
      string.y = balloon.y + 15 ;

      colorChangeTimer++;
      if (colorChangeTimer >= COLOR_CHANGE_INTERVAL) {
        colorChangeTimer = 0;
        balloon.tint = Math.random() * 0xffffff;
      }

      if (
        balloon.x < 0 ||
        balloon.x > app.screen.width ||
        balloon.y < 0 ||
        balloon.y > app.screen.height
      ) {
        app.ticker.remove(update);
        app.stage.removeChild(balloon, alphabet, string);
      }
    };

    app.ticker.add(update);
  }

  // 💥 Balloon burst
  function burst(app, balloon, alphabet, string) {
    playPopSound();
    createBurstParticles(balloon.x, balloon.y, balloon.tint);
    app.stage.removeChild(balloon, alphabet, string);
    score++;
    scoreText.text = `Score: ${score}`;
  }

  // 🔊 Pop SFX
  function playPopSound() {
    const pop = new Audio("assets/pop.mp3");
    pop.play();
  }
})();
