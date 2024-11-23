import {Transaction} from "@mysten/sui/transactions";
const PACKAGE_ID = '0x830e3f14e79dc0526d44da929937beb799d74bcc91c03852a6168f3f00384a19'

/** Hook to provide an instance of the Transactions builder. */
export function useTransactions() {
    return new Transactions(PACKAGE_ID);
}

/**
 * Builds on-chain transactions for the Tic-Tac-Toe game.
 */
class Transactions {
    constructor(packageId) {
        this.packageId = packageId;
    }

    newChar(name, className, race, ownerAddress) {
        const tx = new Transaction();

        const [character] = tx.moveCall({
            target: `${PACKAGE_ID}::character::create_character`,
            arguments: [tx.pure.string(name), tx.pure.string(className), tx.pure.string(race)],
        });

        tx.transferObjects([character], ownerAddress);

        return tx;
    }

    removeCharacter(id) {
        const tx = new Transaction();

        tx.moveCall({
            target: `${PACKAGE_ID}::character::delete`,
            arguments: [tx.object(id)],
        });

        return tx;
    }
}
