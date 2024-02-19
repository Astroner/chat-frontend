import { NetworkIcon } from "./network.icon";
import { HourglassIcon } from "./hourglass.icon";
import { NoNetworkIcon } from "./no-network.icon";
import { ArrowBackIcon } from "./arrow-back.icon";

export const IconsDict = {
    network: NetworkIcon,
    hourglass: HourglassIcon,
    'no-network': NoNetworkIcon,
    'arrow-back': ArrowBackIcon
}

export const IconsNames: IconName[] = Object.keys(IconsDict) as IconName[];

export type IconName = keyof typeof IconsDict;