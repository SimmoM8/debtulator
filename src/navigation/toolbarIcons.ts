import AddIcon from "@expo/material-symbols/add.xml";
import CloseIcon from "@expo/material-symbols/close.xml";
import MoreIcon from "@expo/material-symbols/more_vert.xml";
import SearchIcon from "@expo/material-symbols/search.xml";

export const toolbarIcons = {
  plus: process.env.EXPO_OS === "ios" ? "plus" : AddIcon,

  close: process.env.EXPO_OS === "ios" ? "xmark" : CloseIcon,

  ellipsis: process.env.EXPO_OS === "ios" ? "ellipsis" : MoreIcon,

  magnifyingglass:
    process.env.EXPO_OS === "ios" ? "magnifyingglass" : SearchIcon,
} as const;
