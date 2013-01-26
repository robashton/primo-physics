var util = require('primo-utils')

var RigidBody = function(entity, options) {
  options = options || {}
  this.entity = entity
  this.entity.physics = this
  this.group = util.valueOrDefault(options.group, 'none')
  this.weight = util.valueOrDefault(options.weight, 10)
  this.gravity = util.valueOrDefault(options.gravity, 0.0)
  this.bounce = util.valueOrDefault(options.bounce, 0.5) 
  this.type = util.valueOrDefault(options.type, RigidBody.TYPES.BOX)
  this.solid = util.valueOrDefault(options.solid, true)
  this.dead = false
  this.entity.on('killed', this.onKilled, this)
}

RigidBody.TYPES =  {
  BOX: "box",
  CIRCLE: "circle"
}

RigidBody.prototype = {
  onKilled: function() {
    this.dead = true
  }
}

module.exports = RigidBody

