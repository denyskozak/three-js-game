import React, { useState } from 'react';
import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSignTransaction,
    useSuiClient,
    useSuiClientQuery
} from "@mysten/dapp-kit";
import {Transaction} from "@mysten/sui/transactions";
import {useTransactions} from "./hooks/useTransaction";
import {useExecutor} from "./hooks/useExcecute";

const PACKAGE_ID = '0x830e3f14e79dc0526d44da929937beb799d74bcc91c03852a6168f3f00384a19'
export const CharacterManager = ({ onCharacterSelect }) => {
    const [signature, setSignature] = useState('');
    const client = useSuiClient();
    const account = useCurrentAccount();

    console.log('account ', account)
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const [characterId, setCharacterId] = useState('');
    const [characterDetails, setCharacterDetails] = useState(null);
    const [name, setName] = useState('');
    const [charClass, setCharClass] = useState('');
    const [race, setRace] = useState('');
    const [positionX, setPositionX] = useState(0);
    const [positionY, setPositionY] = useState(0);
    const tx = useTransactions();
    const executor = useExecutor();
    const { data, isLoading, isError, error, refetch } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: account.address,
            limit: 10,
            filter: {
                MatchAll: [
                    {
                        StructType: `${PACKAGE_ID}::character::Character`,
                    },
                ],
            },
            options: {
                // showOwner: true,
                // showType: true,
                showContent: true,
            },
        },
        { queryKey: ['Object'] },
    );

    const handleCreateCharacter = () => {
        executor.mutate({ tx: tx.newChar(name, charClass, race, account.address) }, () => refetch());
    };

    const handleRemoveCharacter = (id) => {
        executor.mutate({
            tx: tx.removeCharacter(id)
        }, () => refetch());
    };

    const handleLogin = (id) => {
        onCharacterSelect(id);
    }

    return (
        <div style={{padding: '20px', maxWidth: '600px', margin: '0 auto'}}>
            <h2>Characters</h2>
            <button onClick={() => { refetch() }}>refetch</button>
            <div>
                {((data && data.data) || []).map(({ data: { objectId, content: { fields } } }, index) => (
                    <div key={objectId}>
                        name: {fields.name},
                        class: {fields.class},
                        race: {fields.race}
                        <button onClick={() => { handleRemoveCharacter(objectId) }}>delete</button>
                        <button onClick={() => { handleLogin(objectId) }}>login</button>
                    </div>
                ))}
            </div>
            <br />
            <h2>Character Manager</h2>

            <div>
                <h3>Create Character</h3>
                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{marginBottom: '10px', display: 'block'}}
                />
                <input
                    type="text"
                    placeholder="Class"
                    value={charClass}
                    onChange={(e) => setCharClass(e.target.value)}
                    style={{marginBottom: '10px', display: 'block'}}
                />
                <input
                    type="text"
                    placeholder="Race"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    style={{marginBottom: '10px', display: 'block'}}
                />
                <button onClick={handleCreateCharacter}>Create Character</button>
            </div>


        </div>
    );
};

export default CharacterManager;
