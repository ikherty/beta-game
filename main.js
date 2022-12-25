'use strict'
// const ACCELERATION = 4000 // px/s^2
// let DRONE_MAX_SPEED = 300 // px/s
// let SCROLL_SPEED = 200
// const GATE_INTERVAL = 300

const app = new Vue({
  el: '#app',
  data: {
    ACCELERATION: 4000, // px/s^2
    DRONE_MAX_SPEED: 300, // px/s
    SCROLL_SPEED: 200,
    GATE_INTERVAL: 300,
    totalScroll: 0,
    lastObstacleSpawned: 0,
    previousTimestamp: 0,
    isStarted: false,
    isCrashed: false,
    isLost: false,
    obstacles: {
      gate: {
        width: 0,
        height: 0
      },
      flag: {
        width: 0,
        height: 0
      },
      // type Obstacle = { type: 'gate' | 'flag', top: number, left: number, checked:boolean }
      // type ObstacleList = Array<Obstacle>
      list: []
    },
    drone: {
      pos: {
        top: 0,
        left: 0
      },
      speed: {
        vertical: 0,
        horizontal: 0
      },
      acceleration: {
        vertical: 0,
        horizontal: 0
      }
    },
    score: 0
  },
  computed: {
    droneRotateY() {
      return (this.drone.speed.horizontal / this.DRONE_MAX_SPEED) * 30
    }
  },
  created() {
    window.addEventListener('keydown', this.startAccelerate)
    window.addEventListener('keyup', this.stopAccelerate)
    window.addEventListener('keyup', this.restartOnKeyPress)

    window.requestAnimationFrame(this.gameLoop)
  },
  mounted() {
    const { gate: gateRef, flag: flagRef } = this.$refs
    const { flag, gate } = this.obstacles

    const { width: gateWidth, height: gateHeight } = gateRef.getBoundingClientRect()
    gate.width = gateWidth
    gate.height = gateHeight

    const { width: flagWidth, height: flagHeight } = flagRef.getBoundingClientRect()
    flag.width = flagWidth
    flag.height = flagHeight

    this.setDrone()
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.startAccelerate)
    window.removeEventListener('keyup', this.stopAccelerate)
    window.removeEventListener('keyup', this.restartOnKeyPress)
  },
  methods: {
    templateLogger(...rest) {
      console.log(...rest)
    },
    setDrone() {
      const { offsetHeight: hStage, offsetWidth: wStage } = this.$refs.stage
      const { offsetHeight: hDrone, offsetWidth: wDrone } = this.$refs.drone

      this.drone.pos.top = hStage - hDrone - 60
      this.drone.pos.left = (wStage - wDrone) / 2
      this.drone.speed.vertical = 0
      this.drone.speed.horizontal = 0
      this.drone.acceleration.vertical = 0
      this.drone.acceleration.horizontal = 0
    },
    up(stop = false) {
      this.drone.acceleration.vertical = -Number(!stop)
    },
    down(stop = false) {
      this.drone.acceleration.vertical = Number(!stop)
    },
    left(stop = false) {
      this.drone.acceleration.horizontal = -Number(!stop)
    },
    right(stop = false) {
      this.drone.acceleration.horizontal = Number(!stop)
    },
    moveDrone(direction, stop = false) {
      switch (direction) {
        case 'left':
          return this.left(stop)
        case 'right':
          return this.right(stop)
        case 'up':
          return this.up(stop)
        case 'down':
          return this.down(stop)
      }
    },
    moveDroneWithKeyboard(e, stop = false) {
      switch (e.code) {
        case 'ArrowUp':
          return this.up(stop)
        case 'ArrowDown':
          return this.down(stop)
        case 'ArrowRight':
          return this.right(stop)
        case 'ArrowLeft':
          return this.left(stop)
      }
    },
    startAccelerate(e) {
      return this.moveDroneWithKeyboard(e)
    },
    stopAccelerate(e) {
      return this.moveDroneWithKeyboard(e, true)
    },
    restartOnKeyPress(e) {
      if (e.code === 'Space') {
        this.restart()
      }
    },
    checkin(dronePosLeft, dronePosTop) {
      const obstaclesList = this.obstacles.list
      for (let i = 0; i < obstaclesList.length; i++) {
        const obstacle = obstaclesList[i]
        const droneCenterHorizontal = dronePosLeft + this.$refs.drone.offsetWidth / 2
        const droneCenterVertical = dronePosTop + this.$refs.drone.offsetHeight / 2

        if (
          droneCenterHorizontal >= obstacle.left &&
          droneCenterHorizontal <= obstacle.left + this.obstacles[obstacle.type].width &&
          obstacle.top <= droneCenterVertical &&
          obstacle.top + this.obstacles[obstacle.type].height >= droneCenterVertical
        ) {
          switch (obstacle.type) {
            case 'flag':
              this.isCrashed = true
              setTimeout(this.failGame, 1000)
              break
            case 'gate':
              if (!obstacle.checked) {
                this.score++
                obstacle.checked = true
              }
              break
          }
        }
      }
    },
    upLevel() {
      switch (this.score) {
        case 10:
          this.SCROLL_SPEED = 250
          break
        case 20:
          this.SCROLL_SPEED = 300
          this.DRONE_MAX_SPEED = 350
          break
        case 30:
          this.SCROLL_SPEED = 330
          break
        case 40:
          this.SCROLL_SPEED = 360
          this.DRONE_MAX_SPEED = 400
          break
        case 50:
          this.SCROLL_SPEED = 390
          break
      }
    },
    gameLoop(timestamp) {
      const dT = (timestamp - this.previousTimestamp) / 1000

      if (this.isStarted) {
        const drone = this.drone

        drone.speed.horizontal = this.calculateSpeed(drone.speed.horizontal, drone.acceleration.horizontal, dT)
        drone.speed.vertical = this.calculateSpeed(drone.speed.vertical, drone.acceleration.vertical, dT)

        const dX = dT * drone.speed.horizontal
        const dY = dT * drone.speed.vertical

        const dS = dT * this.SCROLL_SPEED
        this.totalScroll += dS

        if (this.totalScroll - this.lastObstacleSpawned > this.GATE_INTERVAL) {
          if (this.obstacles.list.length < 10) {
            this.obstacles.list.push(this.spawnObstacle())
            this.lastObstacleSpawned = this.totalScroll
          }
        }

        if (this.obstacles.list.length > 0 && this.obstacles.list[0].top > this.$refs.stage.offsetHeight) {
          const shiftedObstacle = this.obstacles.list.shift()
          if (shiftedObstacle.type === 'gate' && !shiftedObstacle.checked) {
            this.failGame()
          }
        }

        this.obstacles.list.forEach((element) => {
          element.top += dS
        })

        drone.pos.left = this.clamp(drone.pos.left + dX, 0, this.$refs.stage.offsetWidth - this.$refs.drone.offsetWidth)
        drone.pos.top = this.clamp(drone.pos.top + dY, 0, this.$refs.stage.offsetHeight - this.$refs.drone.offsetHeight)

        this.checkin(drone.pos.left, drone.pos.top)
        this.upLevel()
      }

      this.previousTimestamp = timestamp
      window.requestAnimationFrame(this.gameLoop)
    },
    clamp(param, min, max) {
      if (param < min) return min
      if (param > max) return max
      return param
    },
    spawnObstacle() {
      const obstacleType = Math.random() > 0.5 ? 'gate' : 'flag'

      const maxX = this.$refs.stage.offsetWidth - this.obstacles[obstacleType].width

      return {
        id: Date.now(),
        type: obstacleType,
        top: -this.obstacles[obstacleType].height,
        left: Math.random() * maxX,
        checked: false
      }
    },
    failGame() {
      this.isStarted = false
      this.isLost = true
    },
    calculateSpeed(currentSpeed, accelerationDirection, dT) {
      const accelerationFraction = accelerationDirection !== 0 ? accelerationDirection : Math.sign(-currentSpeed)

      const newSpeed = currentSpeed + dT * this.ACCELERATION * accelerationFraction
      const v = accelerationDirection === 0 && Math.sign(newSpeed) !== Math.sign(currentSpeed) ? 0 : newSpeed

      return this.clamp(v, -this.DRONE_MAX_SPEED, this.DRONE_MAX_SPEED)
    },
    restart() {
      this.isStarted = true
      this.isCrashed = false
      this.isLost = false
      this.score = 0
      this.obstacles.list = []
      this.SCROLL_SPEED = 200
      this.setDrone()
    }
  }
})
