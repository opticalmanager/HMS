import type { InventoryItem } from "@/types/hms";

export class InventoryService {
  /**
   * Identifies batches expiring within the specified days threshold (default 90 days)
   */
  static getNearExpiryItems(
    items: Array<InventoryItem & { expiryDate: string }>,
    thresholdDays: number = 90
  ): Array<InventoryItem & { daysRemaining: number }> {
    const today = new Date();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

    return items
      .map((item) => {
        const exp = new Date(item.expiryDate);
        const diffMs = exp.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return { ...item, daysRemaining };
      })
      .filter((item) => item.daysRemaining <= thresholdDays && item.daysRemaining >= 0);
  }

  /**
   * Filters items where available stock has dropped below minimum reorder level
   */
  static getLowStockAlerts(items: InventoryItem[]): InventoryItem[] {
    return items.filter((item) => item.quantityInStock <= item.reorderLevel);
  }

  /**
   * Simulates deducting dispensed medications from inventory
   */
  static dispenseMedications(
    currentStock: number,
    dispenseQty: number
  ): { success: boolean; remainingStock: number; error?: string } {
    if (dispenseQty <= 0) {
      return { success: false, remainingStock: currentStock, error: "Invalid dispensing quantity" };
    }
    if (currentStock < dispenseQty) {
      return {
        success: false,
        remainingStock: currentStock,
        error: `Insufficient stock. Requested: ${dispenseQty}, Available: ${currentStock}`,
      };
    }
    return {
      success: true,
      remainingStock: currentStock - dispenseQty,
    };
  }
}
