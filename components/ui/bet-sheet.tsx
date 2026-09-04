import { Alert, StyleSheet, Text, View, Pressable } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { colors, spacing, radius, typography } from "@/theme";
import { Market, Outcome } from "@/types";
import { useState, useEffect, useRef } from "react";

type Props = {
  market: Market;
  outcome: Outcome;
  onClose: () => void;
};

export function BetSheet(props: Props) {
  const { market, outcome, onClose } = props;
  const p =
    outcome === "YES" ? market.yesProbability : 1 - market.yesProbability;
  const [stake, setStake] = useState("");
  const stakeNumber = Number(stake) || 0;
  const payout = Math.round(stakeNumber / p);

  const handleConfirm = () => {
    Alert.alert("Confirm Bet", `Betting ${stake} credits on ${outcome}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => {} },
    ]);
  };

  const sheetRef = useRef<BottomSheetModal>(null);
  useEffect(() => {
    sheetRef.current?.present();
  }, []);

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      containerComponent={FullWindowOverlay}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.muted }}
    >
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {market.title} Betting{" "}
            <Text style={{ color: outcome === "YES" ? colors.yes : colors.no }}>
              {outcome}{" "}
            </Text>
            at {Math.round(p * 100)}%
          </Text>
          <Text style={styles.heading}>Stake</Text>
          <BottomSheetTextInput
            value={stake}
            onChangeText={setStake}
            keyboardType="number-pad"
            style={styles.inputField}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={styles.heading}>Potential Payout</Text>
            <Text style={styles.heading}>
              <Text style={{ color: colors.yes }}>{payout} </Text>
              Credits
            </Text>
          </View>
          <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
            <Text style={styles.btnText}>Confirm Bet</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.btnText}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
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
    fontSize: 22,
  },
  confirmBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.yes,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.no,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
  },
  btnText: {
    ...typography.headline,
    paddingVertical: 10,
  },
});
