import { useContext, useEffect, useState } from 'react';
import { NetworkContext, SmartStorageContext, StorageContext } from './context';
import { Storage, StorageState } from './storage.class';
import { Network, NetworkState } from './network.class';
import { SmartStorage, SmartStorageType } from './smart-storage.class';

export const useStorage = (): [StorageState, Storage] => {
    const storage = useContext(StorageContext);

    const [state, setState] = useState<StorageState>(() => storage.getState());

    useEffect(() => {
        const sub = storage.subscribe(() => {
            setState(storage.getState());
        });

        return () => {
            sub.unsubscribe();
        };
    }, [storage]);

    return [state, storage];
};

export const useNetwork = (): [NetworkState, Network] => {
    const network = useContext(NetworkContext);

    const [state, setState] = useState<NetworkState>(() => network.getState());

    useEffect(() => {
        const sub = network.subscribe(() => {
            setState(network.getState());
        });

        return () => {
            sub.unsubscribe();
        };
    }, [network]);

    return [state, network];
};

export const useStorageEnv = (): [SmartStorageType, SmartStorage] => {
    const storage = useContext(SmartStorageContext);

    const [type, setType] = useState(() => storage.getType());

    useEffect(() => {
        const sub = storage.subscribe(() => setType(storage.getType()));

        return () => {
            sub.unsubscribe();
        };
    }, [storage]);

    return [type, storage];
};
