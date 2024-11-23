module metawars::character {
    use std::string::{String};

    /// Represents a character in the game.
    public struct Character has key, store {
        id: UID,
        name: String,
        class: String,
        race: String,
        positionX: u64,
        positionY: u64,
        positionZ: u64,
    }

    /// Creates a new character and transfers it to the sender's address.
    public fun create_character(
        name: String,
        class: String,
        race: String,
        ctx: &mut TxContext
    ): Character {
        Character {
            id: object::new(ctx),
            name,
            class,
            race,
            positionX: 0, // Default starting position
            positionY: 0, // Default starting position
            positionZ: 0, // Default starting position
        }
    }

    /// Updates the position of the character.
    public fun update_position(
        character: &mut Character,
        new_positionX: u64,
        new_positionY: u64,
        new_positionZ: u64
    ) {
        character.positionX = new_positionX;
        character.positionY = new_positionY;
        character.positionZ = new_positionZ;
    }

    public fun delete(character: Character) {
        let Character { id, name: _, class: _, race: _, positionX: _, positionY: _, positionZ: _ } = character;
        object::delete(id);
    }
}
