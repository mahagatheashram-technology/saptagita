declare module "@react-native-community/datetimepicker" {
  import * as React from "react";
  import { ViewProps } from "react-native";

  export interface DateTimePickerEvent {
    type: string;
    nativeEvent: { timestamp: number };
  }

  export interface DateTimePickerProps extends ViewProps {
    value: Date;
    mode?: "date" | "time" | "datetime";
    display?: "default" | "spinner" | "calendar" | "clock";
    is24Hour?: boolean;
    textColor?: string;
    themeVariant?: "light" | "dark";
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  }

  const DateTimePicker: React.ComponentType<DateTimePickerProps>;
  export default DateTimePicker;
}
