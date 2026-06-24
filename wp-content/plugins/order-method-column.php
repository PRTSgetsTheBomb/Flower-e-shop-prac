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

/**
 * 订单状态变更时通知 Express 服务端发送邮件
 * 使用 WooCommerce 内置钩子，比 Webhook 更可靠
 */
add_action('woocommerce_order_status_changed', function($order_id, $old_status, $new_status, $order) {
    $webhook_url = 'http://host.docker.internal:5000/api/webhook/order-status';
    $body = json_encode([
        'id'          => $order_id,
        'status'      => $new_status,
        'old_status'  => $old_status,
        'total'       => $order->get_total(),
        'billing'     => [
            'first_name' => $order->get_billing_first_name(),
            'last_name'  => $order->get_billing_last_name(),
            'email'      => $order->get_billing_email(),
        ],
        'line_items'  => array_values(array_map(function($item) {
            return [
                'name'      => $item->get_name(),
                'quantity'  => $item->get_quantity(),
                'price'     => $item->get_total() / max($item->get_quantity(), 1),
                'meta_data' => array_map(function($meta) {
                    return ['key' => $meta->key, 'value' => $meta->value];
                }, array_values($item->get_meta_data())),
            ];
        }, $order->get_items())),
        'meta_data'   => array_values(array_map(function($meta) {
            return ['key' => $meta->key, 'value' => $meta->value];
        }, $order->get_meta_data())),
        'shipping'    => [
            'address_1' => $order->get_shipping_address_1(),
            'city'      => $order->get_shipping_city(),
            'postcode'  => $order->get_shipping_postcode(),
        ],
    ]);

    wp_remote_post($webhook_url, [
        'body'    => $body,
        'headers' => ['Content-Type' => 'application/json'],
        'timeout' => 5,
        'blocking' => false, // 不阻塞，异步发送
    ]);
}, 10, 4);

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
