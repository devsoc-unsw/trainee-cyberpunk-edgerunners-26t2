import {
  Alert,
  Keyboard,
  KeyboardEvent,
  Modal,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { colors, spacing, radius, typography, motion } from "@/theme";
import { useWindowDimensions } from "react-native";
import { Market, Outcome } from "@/types";
import { useEffect, useState } from "react";

type Props = {
  market: Market;
  outcome: Outcome;
};

export function BetSheet(props: Props) {
  const { height } = useWindowDimensions();
  const sheetHeight = height * 0.4;
  const { market, outcome } = props;
  const p =
    outcome === "YES" ? market.yesProbability : 1 - market.yesProbability;
  const [stake, setStake] = useState("");
  const stakeNumber = Number(stake) || 0;
  const payout = Math.round(stakeNumber / p);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const handleConfirm = () => {
    Alert.alert('Confirm Bet', `Betting ${stake} credits on ${outcome}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => {}},
    ]);
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <Modal transparent animationType="none" visible>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.sheet, { height: sheetHeight, bottom: keyboardHeight }]}>
          <Text style={styles.title}>
            {market.title} Betting{" "}
            <Text style={{ color: outcome === "YES" ? colors.yes : colors.no }}>
              {outcome}{" "}
            </Text>
            at {Math.round(p * 100)}%
          </Text>
          <Text style={styles.heading}>Stake</Text>
          <TextInput
            value={stake}
            onChangeText={setStake}
            keyboardType="number-pad"
            style={styles.inputField}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.heading}>Potential Payout</Text>
            <Text style={styles.heading}>
              <Text style={{ color: colors.yes }}>{payout} </Text>
              Credits
            </Text>
          </View>
          <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
            <Text style={styles.confirmText}>Confirm Bet</Text>
          </Pressable>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  heading: {
    ...typography.headline,
    color: colors.muted,
  },
  inputField: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderColor: colors.muted + "40",
    height: 60,
    textAlign: "center",
    color: colors.muted,
    fontSize: 22
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yes,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
  },
  confirmText: {
    ...typography.headline,
    paddingVertical: 10,
  }
});
