// The bike replaces the entire actor quaternion and adds a character IK layer.
export function uprightRider(actor, character, heading){
 actor.rotation.set(0,heading,0)
 character.root.position.y=0
 character.update(0,0)
}
