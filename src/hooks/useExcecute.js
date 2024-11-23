import {useSignAndExecuteTransaction, useSuiClient} from "@mysten/dapp-kit";

export function useExecutor({ execute }= {}) {
    const client = useSuiClient();
    const {
        mutate: signAndExecute,
        status,
        isIdle,
        isPending,
        isSuccess,
        isError,
        isPaused,
    } = useSignAndExecuteTransaction({ execute });

    const mutate = ({ tx, ...options }, then) => {
        signAndExecute(
            {
                transaction: tx,
            },
            {
                onSuccess: ({ digest }) => {
                    client.waitForTransaction({ digest, ...options }).then(then);
                },

                onError: (error) => {
                    console.error('Failed to execute transaction', tx, error);
                },
            },
        );
    };

    return {
        mutate,
        status,
        isIdle,
        isPending,
        isSuccess,
        isError,
        isPaused,
    };
}