/**
 * 场合分类数据
 *
 * 被 Header（下拉菜单）、OccasionCategory（首页场合卡片）、
 * Footer、CollectionPages（标题映射）等多个组件引用。
 * 数据驱动 UI：增删场合只需修改此文件。
 */

const slugFromLink = (link) => link.replace('/collections/', '');

const occasions = [
    {
        title: 'Anniversary Flowers',
        slug: slugFromLink('/collections/anniversary-flowers'),
        desc: 'Romantic flowers, roses and thoughtful arrangements.',
        img: 'https://piscesflower.com.au/cdn/shop/t/5/assets/pf-occasion-anniversary-20260531.jpg?v=121650339871904489981780185180',
        link: '/collections/anniversary-flowers',
    },
    {
        title: 'Sympathy Flowers',
        slug: slugFromLink('/collections/sympathy-flowers'),
        desc: 'Thoughtful tribute flowers and condolence arrangements.',
        img: 'https://piscesflower.com.au/cdn/shop/t/5/assets/pf-occasion-sympathy-20260531.jpg?v=121650339871904489981780185180',
        link: '/collections/sympathy-flowers',
    },
    {
        title: 'New Baby Flowers',
        slug: slugFromLink('/collections/new-baby-flowers'),
        desc: 'Soft flowers and gifts for a new arrival.',
        img: 'https://piscesflower.com.au/cdn/shop/t/5/assets/pf-occasion-new-born-20260531.jpg?v=129627911197597192641780185184',
        link: '/collections/new-baby-flowers',
    },
    {
        title: 'Get Well Soon Flowers',
        slug: slugFromLink('/collections/get-well-soon-flowers'),
        desc: 'Bright flowers to lift spirits and send care.',
        img: 'https://piscesflower.com.au/cdn/shop/t/5/assets/pf-occasion-get-well-20260531.jpg?v=43698127612428500571780185187',
        link: '/collections/get-well-soon-flowers',
    },
    {
        title: 'Celebration Flowers',
        slug: slugFromLink('/collections/celebration-flowers'),
        desc: 'Flowers for birthdays, milestones and joyful moments.',
        img: 'https://piscesflower.com.au/cdn/shop/t/5/assets/pf-occasion-celebration-20260531.jpg?v=121650339871904489981780185180',
        link: '/collections/celebration-flowers',
    },
    {
        title: 'Graduation Flowers',
        slug: slugFromLink('/collections/graduation-flowers'),
        desc: 'Fresh bouquets for proud graduation moments.',
        img: 'https://piscesflower.com.au/cdn/shop/t/5/assets/pf-occasion-graduation-20260531.jpg?v=121650339871904489981780185180',
        link: '/collections/graduation-flowers',
    },
];

export default occasions;