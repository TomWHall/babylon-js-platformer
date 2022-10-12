export default {
    // Movement speed increase per frame as input keys are held
    movementSpeedDelta: 0.005,

    // Maximum absolute movement speed
    maxMovementSpeed: 0.3,
    
    // Vertical speed decrease (gravity) per frame
    verticalSpeedDelta: 0.01,

    // Minimum vertical speed
    minVerticalSpeed: -1,
    
    // Vertical speed at start of jump
    jumpInitialVerticalSpeed: 0.28,
    
    // Opacity of meshes which obstruct the camera's view of the player
    obstructingMeshOpacity: 0.4
};