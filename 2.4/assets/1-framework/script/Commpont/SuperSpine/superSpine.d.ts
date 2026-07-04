// 构建 spine TextureAtlasRegion 需要的数据结构
type TextureAtlasPage = {
    name: string;
    height: number;
    width: number;
    texture: sp_SkeletonTexture;
    magFilter: number;
    minFilter: number;
    uWrap: number;
    vWrap: number;
}

type _size = {
    width: number;
    height: number;
}

type sp_SkeletonTexture = {
    _image: _size;              // 图集的宽高
    _texture: cc.Texture2D;     // cocos 原始纹理类型

}

type TextureAtlasRegion = {
    degrees: number;            // 图集里面旋转的角度
    height: number;             // 图片在图集里面的高度
    u: number;                  // 要裁剪的图片在图集中的 uv 坐标, 也就是 图片的四个顶点 在 整个图集中所占用的百分比.
    u2: number;
    v: number;
    v2: number;
    width: number;              //图片在图集里面的宽度
    x: number;                  // 图片在图集里面的x坐标
    y: number;
    index: number;
    name: string;               // 插槽名字
    offsetX: number;            // 裁剪出来的图片距离渲染尺寸的偏移量
    offsetY: number;
    originalHeight: number;     // 图集的高度
    originalWidth: number;
    rotate: boolean;            // 是否旋转

    page: TextureAtlasPage;
    renderObject: TextureAtlasRegion;
    texture: sp_SkeletonTexture;
}