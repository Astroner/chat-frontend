'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Button } from '../components/button/button.component';
import { useNetwork, useStorage } from '../model/hooks';

import { SlidablePanel } from './components/slidable-panel/slidable-panel.component';
import { SlideAnchor } from './components/slidable-panel/slide-anchor.component';

import { DotsLoader } from './components/dots-loader/dots-loader.component';

import cn from './page.module.scss';

export default function Home() {
    const [storageState, storage] = useStorage();
    const [networkState, network] = useNetwork();

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [buttonTouched, setButtonTouched] = useState(false);

    const announcementVisible = useMemo(() => {
        return networkState.type === 'IDLE' && buttonTouched && !isPanelOpen;
    }, [buttonTouched, isPanelOpen, networkState.type]);

    const touchButton = useCallback(() => {
        setButtonTouched(true);
    }, []);

    const releaseButton = useCallback(() => {
        setButtonTouched(false);
    }, []);

    useEffect(() => {
        const storageState = storage.getState();
        if (
            storageState.type === 'READY' &&
            isPanelOpen &&
            network.getState().type === 'IDLE'
        )
            network.init(storageState.connections, storageState.published);
    }, [isPanelOpen, storage, network]);

    return (
        <main className={cn.root}>
            <SlidablePanel open={isPanelOpen} onStateChange={setIsPanelOpen}>
                <div className={cn['panel-container']}>
                    <div
                        className={
                            cn[
                                'announcement--' +
                                    (announcementVisible ? 'visible' : 'hidden')
                            ]
                        }
                    >
                        Pull-up to connect
                    </div>
                    <div className={cn['quick-bar']}>
                        {networkState.type === 'IDLE' && (
                            <div className={cn['connect-text']}>Not</div>
                        )}
                        <SlideAnchor>
                            <Button
                                color="orange"
                                icon={
                                    networkState.type === 'READY'
                                        ? 'network'
                                        : networkState.type === 'CONNECTING'
                                          ? 'hourglass'
                                          : 'no-network'
                                }
                                onTouchStart={touchButton}
                                onTouchEnd={releaseButton}
                            />
                        </SlideAnchor>
                        {networkState.type === 'IDLE' && (
                            <div className={cn['connect-text']}>Connected</div>
                        )}
                    </div>
                    <div className={cn.networking}>
                        {networkState.type === 'CONNECTING' && (
                            <DotsLoader
                                style={{ width: '100%', height: '100%' }}
                            />
                        )}
                        {networkState.type === 'READY' && (
                            <>
                                <Link
                                    className={cn['menu-button']}
                                    href={'/key/generate'}
                                >
                                    <Button color="orange">
                                        Generate invite QR
                                    </Button>
                                </Link>
                                <Link
                                    className={cn['menu-button']}
                                    href={'/keys'}
                                >
                                    <Button color="orange">
                                        Generated Invites
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </SlidablePanel>
        </main>
    );
}
