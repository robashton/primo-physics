var _ = require('underscore')
var util = require('primo-utils')

// NOTE: This is incorrect, rigid bodies shouldn't be handling themselves
// They should be describing themselves and a core physics system should be 
// reconciling collisions

var RigidBody = function(entity, options) {
  options = options || {}
  this.entity = entity
  this.entity.physics = this
  this.entity.handle('potentialcollision', _.bind(this.onPotentialCollision, this))
  this.entity.handle('collidewith', _.bind(this.collideWith, this))
  this.entity.collideable = true
  this.group = util.valueOrDefault(options.group, 'none')
  this.weight = util.valueOrDefault(options.weight, 10)
  this.gravity = util.valueOrDefault(options.gravity, 0.0)
  this.bounce = util.valueOrDefault(options.bounce, 0.5) 
  this.type = util.valueOrDefault(options.type, RigidBody.TYPES.BOX)
  this.currentIntersection = {}
}

RigidBody.TYPES =  {
  BOX: "box",
  CIRCLE: "circle"
}

RigidBody.prototype = {
  touches: function(other) {
    var otherBody = other.physics
    var otherType = otherBody ? otherBody.type : RigidBody.TYPES.BOX

    if(this.type === RigidBody.TYPES.BOX && otherType === this.type) 
      return boxIntersectsWithBox(this.entity, other)
    else if(this.type === RigidBody.TYPES.CIRCLE && otherType === this.type) 
      return circleIntersectsWithCircle(this.entity, other)
    else if(this.type === RigidBody.TYPES.CIRCLE) 
      return boxIntersectsWithCircle(other, this.entity)
    else 
      return boxIntersectsWithCircle(this.entity, other)
  },
  onPotentialCollision: function(other) {
    if(this.touches(other)) {
      other.dispatch('collidewith', this)
    }
  },
  collideWith: function(other) {
    var entityOne = this.entity
      , entityTwo = other.entity

    if(this.group === other.group && this.group !== 'none')
      return

    var intersection = this.calculateIntersectionBetween(entityOne, entityTwo)
    if(intersection.x === 0 && intersection.y === 0)
      return

    this.entity.raise('collided', other.entity)
    other.entity.raise('collided', this.entity)

    var entityOnePercentage = 0
    var entityTwoPercentage = 0

    if(this.weight > other.weight) {
      entityOnePercentage = other.weight / (other.weight + this.weight)
      entityTwoPercentage = 1.0 - entityOnePercentage
    }
    else if(this.weight < other.weight) {
      entityTwoPercentage = this.weight / (other.weight + this.weight)
      entityOnePercentage = 1.0 - entityTwoPercentage
    }
    else {
      entityOnePercentage = 0.5
      entityTwoPercentage = 0.5
    }

    entityOne.x += intersection.x * (entityOnePercentage + 0.01)
    entityOne.y += intersection.y * (entityOnePercentage + 0.01)
    entityTwo.x -= intersection.x * (entityTwoPercentage + 0.01)
    entityTwo.y -= intersection.y * (entityTwoPercentage + 0.01)

    if(intersection.x < 0)
      this.applyHorizontalBounce(this, other, entityOnePercentage, entityTwoPercentage)
    else if(intersection.x > 0)
      this.applyHorizontalBounce(other, this, entityTwoPercentage, entityOnePercentage)

    if(intersection.y < 0)
      this.applyVerticalBounce(this, other, entityOnePercentage, entityTwoPercentage)
    else if(intersection.y > 0)
      this.applyVerticalBounce(other, this, entityTwoPercentage, entityOnePercentage)

  },
  applyHorizontalBounce: function(left, right, leftPercentage, rightPercentage) {
    var leftEntity = left.entity
      , rightEntity = right.entity

    var bounce = (leftEntity.velx - rightEntity.velx) 
    var addition = (leftEntity.velx * rightPercentage + rightEntity.velx * leftPercentage)

    leftEntity.velx = (addition *  (1.0 - left.bounce)) - bounce * left.bounce 
    rightEntity.velx =  (addition * (1.0 - right.bounce)) + bounce * right.bounce
  },
  applyVerticalBounce: function(top, bottom, topPercentage, bottomPercentage) {
    var topEntity = top.entity,
        bottomEntity = bottom.entity
    
    var bounce = (topEntity.vely - bottomEntity.vely)
    var addition = (topEntity.vely * bottomPercentage + bottomEntity.vely * topPercentage)

    topEntity.vely = (addition * (1.0 - top.bounce)) - bounce  * top.bounce
    bottomEntity.vely = (addition * (1.0 - bottom.bounce)) + bounce * bottom.bounce
  },
  calculateIntersectionBetween: function(one, two, onec, twoc) {
    var x = 0, y = 0

    // Did the right of 'one' brush into the left of 'two'?
    if(one.lastx + one.width < two.lastx && one.x + one.width > two.x) 
      x = two.x - (one.x + one.width) 

    // Did the left of 'one' brush into the right of 'two'?
    else if(one.lastx > two.lastx + two.width && one.x < two.x + two.width)
      x = (two.x + two.width) - one.x

    // Did the bottom of 'one' brush into the 'top' of 'two'?
    if(one.lasty + one.height < two.lasty && one.y + one.height > two.y)
      y = two.y - (one.y + one.height) 

    // Did the top of 'one' brush into the 'bottom' of 'two'?
    else if(one.lasty > two.lasty + two.height && one.y < two.y + two.height)
      y = (two.y + two.height) - one.y

    // Woah, noes, mostly likely a spawn failure
    // Or we've already dealt with this collision
    if(x === 0 && y === 0) {
      if(onec.touches(twoc)) {
        x = two.x - (one.x + one.width) 
        y = two.y - (one.y + one.height) 
      }
    }

    this.currentIntersection.x = x
    this.currentIntersection.y = y
    return this.currentIntersection
  }
}

module.exports = RigidBody

function boxIntersectsWithBox(boxOne, boxTwo) {
  if(boxOne.x > boxTwo.x + boxTwo.width) return
  if(boxOne.y > boxTwo.y + boxTwo.height) return
  if(boxOne.x + boxOne.width < boxTwo.x) return
  if(boxOne.y + boxOne.height < boxTwo.y) return
  return true
}

function boxIntersectsWithCircle(box, circle) {
  return boxIntersectsWithBox(box, circle) // for now/ lazy
}

function circleIntersectsWithCircle(circleOne, circleTwo) {
  var r1 = (circleOne.width > circleOne.height ? circleOne.width : circleOne.height) / 2.0
  var r2 = (circleTwo.width > circleTwo.height ? circleTwo.width : circleTwo.height) / 2.0
  var distancex = (circleOne.x + circleOne.width/2) - (circleTwo.x + circleTwo.width/2)
  var distancey = (circleOne.y + circleOne.height/2) - (circleTwo.y + circleTwo.height/2)
  var distanceSq = (distancex*distancex) + (distancey*distancey)
  return distanceSq < (r1+r2) * (r1+r2)
}

