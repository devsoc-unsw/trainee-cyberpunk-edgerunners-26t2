import { StyleSheet, Text, View, Pressable, Keyboard } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { placeBet } from "@/lib/data";
import { useBalance } from "@/state/balance";
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
  const payout = p > 0 ? Math.round(stakeNumber / p) : stakeNumber;
  const outcomeId = market.outcomes?.find((o) => o.name === outcome)?.id;
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const { setBalance } = useBalance();

  const handleConfirm = () => {
    if (!outcomeId) return;
    setErrorMessage(null);
    setIsConfirmVisible(true);
  };

  const submitBet = async () => {
    if (!outcomeId) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await placeBet(outcomeId, stakeNumber);
      setBalance(result.balance);
      setIsConfirmVisible(false);
      onClose();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardUp(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardUp(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const sheetRef = useRef<BottomSheetModal>(null);
  useEffect(() => {
    sheetRef.current?.present();
  }, []);

  // { keyboardup && Pressable ... } dismisses keyboard on any tap
  // and blocks confirm/cancel while inputting stake
  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      enablePanDownToClose
      enableBlurKeyboardOnGesture
      keyboardBlurBehavior="restore"
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.muted }}
    >
      <BottomSheetView style={styles.sheet}>
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
          maxLength={3}
          style={styles.inputField}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.heading}>Potential Payout</Text>
          <Text style={styles.heading}>
            <Text style={{ color: colors.yes }}>{payout} </Text>
            Credits
          </Text>
        </View>
        <Pressable
          onPress={handleConfirm}
          disabled={!outcomeId}
          style={[styles.confirmBtn, !outcomeId && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {`Bet ${stakeNumber} on ${outcome}`}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={[styles.cancelBtn, keyboardUp && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>Cancel</Text>
        </Pressable>

        {keyboardUp && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
        )}

        <ConfirmDialog
          visible={isConfirmVisible}
          title="Place bet"
          message={`Bet ${stakeNumber} credits on ${outcome} at ${Math.round(p * 100)}%?`}
          confirmLabel="Place bet"
          isBusy={isSubmitting}
          errorMessage={errorMessage}
          onConfirm={submitBet}
          onCancel={() => {
            setIsConfirmVisible(false);
            setErrorMessage(null);
          }}
        />
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
    borderWidth: 1,
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
  btnDisabled: {
    opacity: 0.4,
  },
});
