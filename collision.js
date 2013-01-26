var RigidBody = require('./rigidbody')
var intersection = {}

module.exports = function(one, two) {
  var bodyOne = one.physics
    , bodyTwo = two.physics

  if(!bodyOne || !bodyTwo) return
  if(!intersects(one, two, intersection)) return
  if(bodyOne.group === bodyTwo.group && bodyOne.group !== 'none') return
  if(bodyOne.dead || bodyTwo.dead) return
  if(intersection.x === 0 && intersection.y === 0) return

  one.raise('collided', two)
  two.raise('collided', one)

  if(!bodyOne.solid || !bodyTwo.solid) return

  handleVerifiedCollision(one, two)
}


function intersects(one, two, intersection) {
  var bodyOne = one.physics
    , bodyTwo = two.physics

  if(bodyOne.type === RigidBody.TYPES.BOX && bodyTwo.type === bodyOne.type) 
    return boxIntersectsWithBox(one, two, intersection)
  else if(bodyOne.type === RigidBody.TYPES.CIRCLE && bodyTwo.type === bodyOne.type) 
    return circleIntersectsWithCircle(one, two, intersection)
  else if(bodyOne.type === RigidBody.TYPES.CIRCLE) 
    return boxIntersectsWithCircle(one, two, intersection)
  else 
    return boxIntersectsWithCircle(one, two, intersection)
}

function handleVerifiedCollision(entityOne, entityTwo) {
  var bodyOne = entityOne.physics
    , bodyTwo = entityTwo.physics

    var entityOnePercentage = 0
    var entityTwoPercentage = 0

    if(bodyOne.weight > bodyTwo.weight) {
      entityOnePercentage = bodyTwo.weight / (bodyTwo.weight + bodyOne.weight)
      entityTwoPercentage = 1.0 - entityOnePercentage
    }
    else if(bodyOne.weight < bodyTwo.weight) {
      entityTwoPercentage = bodyOne.weight / (bodyTwo.weight + bodyOne.weight)
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
      applyHorizontalBounce(entityOne, entityTwo, entityOnePercentage, entityTwoPercentage)
    else if(intersection.x > 0)
      applyHorizontalBounce(entityTwo, entityOne, entityTwoPercentage, entityOnePercentage)

    if(intersection.y < 0)
      applyVerticalBounce(entityOne, entityTwo, entityOnePercentage, entityTwoPercentage)
    else if(intersection.y > 0)
      applyVerticalBounce(entityTwo, entityOne, entityTwoPercentage, entityOnePercentage)
}

function applyHorizontalBounce(leftEntity, rightEntity, leftPercentage, rightPercentage) {
  var leftBody = leftEntity.physics 
    , rightBody = rightEntity.physics

  var bounce = (leftEntity.velx - rightEntity.velx) 
  var addition = (leftEntity.velx * rightPercentage + rightEntity.velx * leftPercentage)

  leftEntity.velx = (addition *  (1.0 - leftBody.bounce)) - bounce * leftBody.bounce 
  rightEntity.velx =  (addition * (1.0 - rightBody.bounce)) + bounce * rightBody.bounce
}

function applyVerticalBounce(topEntity, bottomEntity, topPercentage, bottomPercentage) {
  var topBody = topEntity.physics,
      bottomBody = bottomEntity.physics
  
  var bounce = (topEntity.vely - bottomEntity.vely)
  var addition = (topEntity.vely * bottomPercentage + bottomEntity.vely * topPercentage)

  topEntity.vely = (addition * (1.0 - topBody.bounce)) - bounce  * topBody.bounce
  bottomEntity.vely = (addition * (1.0 - bottomBody.bounce)) + bounce * bottomBody.bounce
}

function boxIntersectsWithBox(boxOne, boxTwo, intersection) {
  if(boxOne.x > boxTwo.x + boxTwo.width) return
  if(boxOne.y > boxTwo.y + boxTwo.height) return
  if(boxOne.x + boxOne.width < boxTwo.x) return
  if(boxOne.y + boxOne.height < boxTwo.y) return
  calculateBoxBoxIntersection(boxOne, boxTwo, intersection)
  return true
}

function boxIntersectsWithCircle(box, circle, intersection) {
  return boxIntersectsWithBox(box, circle, intersection) // for now/ lazy
}

function circleIntersectsWithCircle(circleOne, circleTwo, intersection) {
  var r1 = (circleOne.width > circleOne.height ? circleOne.width : circleOne.height) / 2.0
    , r2 = (circleTwo.width > circleTwo.height ? circleTwo.width : circleTwo.height) / 2.0
    , distancex = (circleOne.x + circleOne.width/2) - (circleTwo.x + circleTwo.width/2)
    , distancey = (circleOne.y + circleOne.height/2) - (circleTwo.y + circleTwo.height/2)
    , distance = Math.sqrt((distancex*distancex) + (distancey*distancey))
    , overlap = (r1 + r2) - distance

  if(overlap < 0) return false

  // This is an aproximation making the assumption that the vector found here
  // would be similar to the actual vector at the point of collision
  var vx = circleOne.lastx - circleTwo.lastx
    , vy = circleOne.lasty - circleTwo.lasty
    , mag = Math.sqrt((vx*vx) + (vy*vy))

  vx /= mag
  vy /= mag

  // Now we just need the magnitude of this vector
  intersection.x = vx * overlap
  intersection.y = vy * overlap
  return true
}


function calculateBoxBoxIntersection(one, two, intersection) {
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
  if(x === 0 && y === 0) {
    x = two.x - (one.x + one.width) 
    y = two.y - (one.y + one.height) 
  }

  intersection.x = x
  intersection.y = y
}
