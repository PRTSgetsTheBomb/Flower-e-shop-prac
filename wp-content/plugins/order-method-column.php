<?php
/**
 * Plugin Name: Order Method Column
 * Description: 在 WooCommerce 订单列表添加 "Method" 列，显示 Delivery / Pickup
 * Version: 1.0
 */

// 添加列
add_filter('manage_edit-shop_order_columns', function($columns) {
    $new = [];
    foreach ($columns as $key => $value) {
        $new[$key] = $value;
        if ($key === 'order_status') {
            $new['delivery_method'] = 'Method';
        }
    }
    return $new;
});

// 显示列内容
add_action('manage_shop_order_posts_custom_column', function($column) {
    if ($column === 'delivery_method') {
        $method = get_post_meta(get_the_ID(), 'delivery_method', true);
        if ($method) {
            $color = $method === 'Delivery' ? '#28a745' : '#fd7e14';
            echo '<span style="color:' . $color . ';font-weight:600;">' . $method . '</span>';
        } else {
            $order = wc_get_order(get_the_ID());
            echo $order && $order->has_shipping_address() ? 'Delivery' : 'Pickup';
        }
    }
});
