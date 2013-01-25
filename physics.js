var CollisionGrid = require('./collisiongrid')
var RigidBody = require('./rigidbody')

var physics = {
  init: function(game) {
    game.on('PostTick', function() {
      var grid = null
      grid = new CollisionGrid(game.cellsize)
      game.scene.forEachEntity(function(entity) {
        if(entity.physics)
          grid.addEntity(entity)
      })
      grid.performCollisionChecks()
    })
  },
  RigidBody: RigidBody
}

module.exports = physics
